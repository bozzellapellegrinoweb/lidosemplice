"use client";

/**
 * GlobalNotifications — vive nel layout, persiste tra tutte le navigazioni.
 *
 * Usa POLLING ogni 5s (stesso meccanismo delle singole pagine ordini-bar e
 * prenotazioni) invece di affidarsi solo al Realtime che non è affidabile.
 *
 * Audio: sblocco automatico al primo click ovunque nel documento.
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { X, ShoppingBag, Umbrella, Bell, BellOff } from "lucide-react";

// ── Audio ─────────────────────────────────────────────────────────────────────

let _ctx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!_ctx) {
    _ctx = new (window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
  }
  return _ctx;
}

async function unlockAudio() {
  try {
    const ctx = getCtx();
    if (ctx.state === "suspended") await ctx.resume();
  } catch {}
}

async function beepOnce(type: "bar" | "booking") {
  try {
    const ctx = getCtx();
    if (ctx.state === "suspended") await ctx.resume();
    if (ctx.state !== "running") return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "sine";

    if (type === "bar") {
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.setValueAtTime(660, ctx.currentTime + 0.1);
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.2);
      gain.gain.setValueAtTime(0.5, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.6);
    } else {
      osc.frequency.setValueAtTime(523, ctx.currentTime);
      osc.frequency.setValueAtTime(659, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.4, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.5);
    }
  } catch {}
}

// ── Tipi ─────────────────────────────────────────────────────────────────────

interface Toast {
  id: string;
  type: "bar" | "booking";
  message: string;
  href: string;
}

// ─────────────────────────────────────────────────────────────────────────────

export function GlobalNotifications({ establishmentId, slug }: {
  establishmentId: string;
  slug: string;
}) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [soundOn, setSoundOn] = useState(true);
  const [audioUnlocked, setAudioUnlocked] = useState(false);

  const soundOnRef = useRef(true);
  const mountedRef = useRef(true);
  const lastBarTimestampRef = useRef<string | null>(null);
  const lastBookingTimestampRef = useRef<string | null>(null);
  const estIdRef = useRef(establishmentId);

  useEffect(() => { estIdRef.current = establishmentId; }, [establishmentId]);
  useEffect(() => { soundOnRef.current = soundOn; }, [soundOn]);
  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false; }; }, []);

  // Sblocca AudioContext al primo click ovunque
  useEffect(() => {
    const handler = async () => {
      await unlockAudio();
      if (mountedRef.current) setAudioUnlocked(true);
      document.removeEventListener("click", handler);
      document.removeEventListener("keydown", handler);
    };
    document.addEventListener("click", handler, { passive: true });
    document.addEventListener("keydown", handler, { passive: true });
    return () => {
      document.removeEventListener("click", handler);
      document.removeEventListener("keydown", handler);
    };
  }, []);

  const addToast = useCallback((toast: Omit<Toast, "id">) => {
    if (!mountedRef.current) return;
    const id = crypto.randomUUID();
    setToasts((prev) => [...prev.slice(-3), { ...toast, id }]);
    if (soundOnRef.current) beepOnce(toast.type);
    setTimeout(() => {
      if (mountedRef.current) setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 8000);
  }, []);

  const removeToast = useCallback((id: string) => {
    if (mountedRef.current) setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // ── Polling ordini bar ────────────────────────────────────────────────────

  const pollOrders = useCallback(async () => {
    const id = estIdRef.current;
    if (!id) return;
    const supabase = createClient();
    const { data } = await supabase
      .from("bar_orders")
      .select("id, umbrella_label, guest_name, created_at")
      .eq("establishment_id", id)
      .order("created_at", { ascending: false })
      .limit(1);

    if (data && data.length > 0) {
      const newest = data[0];
      if (
        lastBarTimestampRef.current &&
        new Date(newest.created_at) > new Date(lastBarTimestampRef.current)
      ) {
        addToast({
          type: "bar",
          message: `Ordine bar — ${newest.umbrella_label || newest.guest_name || "nuovo"}`,
          href: `/dashboard/${slug}/ordini-bar`,
        });
      }
      lastBarTimestampRef.current = newest.created_at;
    }
  }, [slug, addToast]);

  // ── Polling prenotazioni ──────────────────────────────────────────────────

  const pollBookings = useCallback(async () => {
    const id = estIdRef.current;
    if (!id) return;
    const supabase = createClient();
    const { data } = await supabase
      .from("bookings")
      .select("guest_name, booking_code, created_at")
      .eq("establishment_id", id)
      .order("created_at", { ascending: false })
      .limit(1);

    if (data && data.length > 0) {
      const newest = data[0];
      if (
        lastBookingTimestampRef.current &&
        new Date(newest.created_at) > new Date(lastBookingTimestampRef.current)
      ) {
        addToast({
          type: "booking",
          message: `Nuova prenotazione — ${newest.guest_name || "Cliente"}`,
          href: `/dashboard/${slug}/prenotazioni`,
        });
      }
      lastBookingTimestampRef.current = newest.created_at;
    }
  }, [slug, addToast]);

  // Inizializza i timestamp al mount, poi avvia i poll
  useEffect(() => {
    if (!establishmentId) return;
    const supabase = createClient();

    // Fetch timestamp iniziale (non triggerare alert per vecchi record)
    async function initTimestamps() {
      const [{ data: bar }, { data: booking }] = await Promise.all([
        supabase
          .from("bar_orders")
          .select("created_at")
          .eq("establishment_id", establishmentId)
          .order("created_at", { ascending: false })
          .limit(1),
        supabase
          .from("bookings")
          .select("created_at")
          .eq("establishment_id", establishmentId)
          .order("created_at", { ascending: false })
          .limit(1),
      ]);
      lastBarTimestampRef.current = bar?.[0]?.created_at ?? null;
      lastBookingTimestampRef.current = booking?.[0]?.created_at ?? null;
    }

    let barInterval: ReturnType<typeof setInterval>;
    let bookingInterval: ReturnType<typeof setInterval>;

    initTimestamps().then(() => {
      if (!mountedRef.current) return;
      barInterval = setInterval(pollOrders, 5000);
      bookingInterval = setInterval(pollBookings, 5000);
    });

    return () => {
      clearInterval(barInterval);
      clearInterval(bookingInterval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [establishmentId]);

  async function toggleSound() {
    await unlockAudio();
    setAudioUnlocked(true);
    const next = !soundOn;
    setSoundOn(next);
    soundOnRef.current = next;
    if (next) beepOnce("booking");
  }

  return (
    <div className="fixed bottom-4 right-4 z-[9999] flex flex-col items-end gap-2">
      {toasts.map((toast) => (
        <Link
          key={toast.id}
          href={toast.href}
          onClick={() => removeToast(toast.id)}
          className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 shadow-xl transition hover:opacity-90 w-72"
        >
          <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
            toast.type === "bar" ? "bg-orange-500/15 text-orange-500" : "bg-blue-500/15 text-blue-500"
          }`}>
            {toast.type === "bar" ? <ShoppingBag className="h-4 w-4" /> : <Umbrella className="h-4 w-4" />}
          </span>
          <span className="flex-1 text-sm font-medium text-foreground">{toast.message}</span>
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); removeToast(toast.id); }}
            className="shrink-0 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </Link>
      ))}

      <button
        onClick={toggleSound}
        title={soundOn ? "Suono attivo — clicca per disattivare" : "Suono disattivato — clicca per attivare"}
        className={`flex h-10 w-10 items-center justify-center rounded-full shadow-lg border transition-all ${
          soundOn
            ? audioUnlocked
              ? "bg-green-500 border-green-400 text-white"
              : "bg-yellow-500 border-yellow-400 text-white"
            : "bg-muted border-border text-muted-foreground"
        }`}
      >
        {soundOn ? <Bell className="h-5 w-5" /> : <BellOff className="h-5 w-5" />}
      </button>
    </div>
  );
}

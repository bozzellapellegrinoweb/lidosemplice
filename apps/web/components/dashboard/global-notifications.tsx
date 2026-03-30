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
import { useRouter } from "next/navigation";
import { AlertCircle, Umbrella, Bell, BellOff, Calendar } from "lucide-react";

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

// Loop di allerta: suona ogni 2.5s finché non si chiama stop()
function startAlertLoop(type: "bar" | "booking"): () => void {
  let stopped = false;
  beepOnce(type);
  const interval = setInterval(() => { if (!stopped) beepOnce(type); }, 2500);
  return () => { stopped = true; clearInterval(interval); };
}

// ── Tipi ─────────────────────────────────────────────────────────────────────

interface Toast {
  id: string;
  type: "bar" | "booking";
  // bar
  umbrella_label?: string;
  guest_name?: string;
  total_cents?: number;
  notes?: string;
  // booking
  start_date?: string;
  end_date?: string;
  booking_code?: string;
  href: string;
  stopSound: () => void;
}

// ─────────────────────────────────────────────────────────────────────────────

export function GlobalNotifications({ establishmentId, slug }: {
  establishmentId: string;
  slug: string;
}) {
  const router = useRouter();
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

  const removeToast = useCallback((id: string) => {
    if (!mountedRef.current) return;
    setToasts((prev) => {
      const toast = prev.find((t) => t.id === id);
      if (toast) toast.stopSound();
      return prev.filter((t) => t.id !== id);
    });
  }, []);

  const addToast = useCallback((toast: Omit<Toast, "id" | "stopSound">) => {
    if (!mountedRef.current) return;
    const id = crypto.randomUUID();
    const stopSound = soundOnRef.current ? startAlertLoop(toast.type) : () => {};
    // Mostra solo 1 modal alla volta — se c'è già qualcosa, accoda
    setToasts((prev) => [...prev, { ...toast, id, stopSound }]);
  }, []);

  // Ferma tutti i suoni quando si smonta (es. logout)
  useEffect(() => {
    return () => {
      setToasts((prev) => { prev.forEach((t) => t.stopSound()); return []; });
    };
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
          umbrella_label: newest.umbrella_label || "?",
          guest_name: newest.guest_name || "Cliente",
          total_cents: newest.total_cents,
          notes: newest.notes,
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
          guest_name: newest.guest_name || "Cliente",
          start_date: newest.start_date,
          end_date: newest.end_date,
          total_cents: newest.total_cents,
          booking_code: newest.booking_code,
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

  // Mostra solo il primo toast come modal — gli altri sono in coda
  const current = toasts[0] ?? null;

  return (
    <>
      {/* Modal centrato con overlay blur */}
      {current && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl bg-white p-8 text-center shadow-2xl dark:bg-zinc-900">
            {current.type === "bar" ? (
              <>
                <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-orange-500/15">
                  <AlertCircle className="h-10 w-10 animate-pulse text-orange-500" />
                </div>
                <h2 className="mb-1 text-2xl font-black tracking-tight">NUOVO ORDINE BAR!</h2>
                <div className="mb-6 space-y-2">
                  <div className="flex items-center justify-center gap-2 text-xl font-bold">
                    <Umbrella className="h-5 w-5 text-orange-500" />
                    Ombrellone {current.umbrella_label}
                  </div>
                  <p className="text-lg text-muted-foreground">{current.guest_name}</p>
                  {current.notes && (
                    <p className="rounded-lg bg-muted px-3 py-1.5 text-sm italic">Nota: {current.notes}</p>
                  )}
                  {current.total_cents != null && (
                    <p className="text-3xl font-black text-orange-500">
                      {(current.total_cents / 100).toFixed(2)}€
                    </p>
                  )}
                </div>
                <button
                  onClick={() => { removeToast(current.id); router.push(current.href); }}
                  className="w-full rounded-xl bg-orange-500 py-4 text-lg font-bold text-white transition hover:bg-orange-600 active:scale-95"
                >
                  Ho visto — Preparo!
                </button>
              </>
            ) : (
              <>
                <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-blue-500/15">
                  <AlertCircle className="h-10 w-10 animate-pulse text-blue-500" />
                </div>
                <h2 className="mb-1 text-2xl font-black tracking-tight">NUOVA PRENOTAZIONE!</h2>
                <div className="mb-6 space-y-2">
                  <p className="text-xl font-bold">{current.guest_name}</p>
                  {current.start_date && (
                    <div className="flex items-center justify-center gap-2 text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span>
                        {current.start_date === current.end_date
                          ? current.start_date
                          : `${current.start_date} → ${current.end_date}`}
                      </span>
                    </div>
                  )}
                  {current.booking_code && (
                    <p className="font-mono text-sm text-muted-foreground">{current.booking_code}</p>
                  )}
                  {current.total_cents != null && (
                    <p className="text-3xl font-black text-blue-500">
                      {(current.total_cents / 100).toFixed(2)}€
                    </p>
                  )}
                </div>
                <button
                  onClick={() => { removeToast(current.id); router.push(current.href); }}
                  className="w-full rounded-xl bg-blue-500 py-4 text-lg font-bold text-white transition hover:bg-blue-600 active:scale-95"
                >
                  Ho visto!
                </button>
              </>
            )}
            {toasts.length > 1 && (
              <p className="mt-3 text-xs text-muted-foreground">+{toasts.length - 1} altri in attesa</p>
            )}
          </div>
        </div>
      )}

      {/* Campanella fissa in basso a destra */}
      <div className="fixed bottom-4 right-4 z-[9998]">
        <button
          onClick={toggleSound}
          title={soundOn ? "Suono attivo" : "Suono disattivato"}
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
    </>
  );
}

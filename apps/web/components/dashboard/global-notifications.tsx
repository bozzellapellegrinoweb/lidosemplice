"use client";

/**
 * GlobalNotifications — vive nel layout, persiste tra le navigazioni.
 *
 * Problemi risolti:
 * - AudioContext richiede un gesto utente (autoplay policy). Viene sbloccato
 *   automaticamente al primo click/tap su qualsiasi punto del dashboard.
 * - Il pulsante campanella in basso a destra sblocca l'audio esplicitamente
 *   e mostra lo stato suono on/off.
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { X, ShoppingBag, Umbrella, Bell, BellOff } from "lucide-react";

// ── AudioContext singleton ────────────────────────────────────────────────────

let _ctx: AudioContext | null = null;
let _audioUnlocked = false;

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
    _audioUnlocked = true;
  } catch {}
}

async function beepOnce(type: "bar" | "booking") {
  try {
    const ctx = getCtx();
    if (ctx.state === "suspended") {
      await ctx.resume();
    }
    if (ctx.state !== "running") return; // ancora bloccato, skip

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

  useEffect(() => { soundOnRef.current = soundOn; }, [soundOn]);
  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false; }; }, []);

  // Sblocca AudioContext al primo click ovunque nel documento
  useEffect(() => {
    const handler = async () => {
      await unlockAudio();
      setAudioUnlocked(true);
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
    if (mountedRef.current) setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback((toast: Omit<Toast, "id">) => {
    const id = crypto.randomUUID();
    setToasts((prev) => [...prev.slice(-3), { ...toast, id }]);
    if (soundOnRef.current) beepOnce(toast.type);
    setTimeout(() => {
      if (mountedRef.current) setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 8000);
  }, []);

  // Supabase Realtime
  useEffect(() => {
    if (!establishmentId) return;
    const supabase = createClient();

    const barChannel = supabase
      .channel(`global-bar-${establishmentId}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "bar_orders",
        filter: `establishment_id=eq.${establishmentId}`,
      }, () => {
        addToast({ type: "bar", message: "Nuovo ordine bar", href: `/dashboard/${slug}/ordini-bar` });
      })
      .subscribe();

    const bookingChannel = supabase
      .channel(`global-bookings-${establishmentId}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "bookings",
        filter: `establishment_id=eq.${establishmentId}`,
      }, (payload) => {
        const b = payload.new as { guest_name?: string };
        addToast({
          type: "booking",
          message: `Nuova prenotazione${b.guest_name ? ` — ${b.guest_name}` : ""}`,
          href: `/dashboard/${slug}/prenotazioni`,
        });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(barChannel);
      supabase.removeChannel(bookingChannel);
    };
  }, [establishmentId, slug, addToast]);

  async function toggleSound() {
    // Il click sul pulsante sblocca anche l'AudioContext
    await unlockAudio();
    setAudioUnlocked(true);
    const next = !soundOn;
    setSoundOn(next);
    soundOnRef.current = next;
    if (next) beepOnce("booking"); // beep di conferma
  }

  return (
    <div className="fixed bottom-4 right-4 z-[9999] flex flex-col items-end gap-2">
      {/* Toast */}
      {toasts.map((toast) => (
        <Link
          key={toast.id}
          href={toast.href}
          onClick={() => removeToast(toast.id)}
          className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 shadow-xl transition hover:opacity-90 max-w-xs w-72"
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

      {/* Pulsante campanella — sempre visibile, sblocca audio al click */}
      <button
        onClick={toggleSound}
        title={soundOn ? "Notifiche sonore attive — clicca per disattivare" : "Notifiche sonore disattivate — clicca per attivare"}
        className={`flex h-10 w-10 items-center justify-center rounded-full shadow-lg border transition-all ${
          soundOn
            ? audioUnlocked
              ? "bg-green-500 border-green-400 text-white"
              : "bg-yellow-500 border-yellow-400 text-white"  // arancione = non ancora sbloccato
            : "bg-muted border-border text-muted-foreground"
        }`}
      >
        {soundOn ? <Bell className="h-5 w-5" /> : <BellOff className="h-5 w-5" />}
      </button>
    </div>
  );
}

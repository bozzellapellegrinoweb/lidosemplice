"use client";

/**
 * GlobalNotifications
 *
 * Vive nel layout del dashboard (persiste tra le navigazioni).
 * Ascolta Supabase Realtime per:
 *   - nuovi ordini bar (bar_orders INSERT)
 *   - nuove prenotazioni (bookings INSERT)
 *
 * Suona e mostra un toast cliccabile quando arriva qualcosa di nuovo.
 * Il suono richiede un gesto utente per sbloccarsi (autoplay policy browser).
 */

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { X, ShoppingBag, Umbrella } from "lucide-react";

// ── Audio ─────────────────────────────────────────────────────────────────────

let _audioCtx: AudioContext | null = null;

function getAudioCtx(): AudioContext {
  if (!_audioCtx) {
    _audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
  }
  return _audioCtx;
}

async function beepOnce(type: "bar" | "booking") {
  try {
    const ctx = getAudioCtx();
    if (ctx.state === "suspended") await ctx.resume();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "sine";
    if (type === "bar") {
      // ordine bar: doppio bip acuto
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.setValueAtTime(660, ctx.currentTime + 0.1);
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.2);
      gain.gain.setValueAtTime(0.5, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.6);
    } else {
      // prenotazione: bip singolo più grave
      osc.frequency.setValueAtTime(523, ctx.currentTime);
      gain.gain.setValueAtTime(0.4, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.5);
    }
  } catch {}
}

// ── Toast ─────────────────────────────────────────────────────────────────────

interface Toast {
  id: string;
  type: "bar" | "booking";
  message: string;
  href: string;
}

// ─────────────────────────────────────────────────────────────────────────────

export function GlobalNotifications({ establishmentId, slug, soundEnabled }: {
  establishmentId: string;
  slug: string;
  soundEnabled: boolean;
}) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const soundEnabledRef = useRef(soundEnabled);
  const mountedRef = useRef(true);

  useEffect(() => { soundEnabledRef.current = soundEnabled; }, [soundEnabled]);
  useEffect(() => { return () => { mountedRef.current = false; }; }, []);

  function addToast(toast: Omit<Toast, "id">) {
    const id = crypto.randomUUID();
    setToasts((prev) => [...prev.slice(-3), { ...toast, id }]); // max 4 toast
    if (soundEnabledRef.current) beepOnce(toast.type);
    setTimeout(() => removeToast(id), 8000);
  }

  function removeToast(id: string) {
    if (mountedRef.current) setToasts((prev) => prev.filter((t) => t.id !== id));
  }

  useEffect(() => {
    if (!establishmentId) return;
    const supabase = createClient();

    // ── Ordini bar ──
    const barChannel = supabase
      .channel(`global-bar-${establishmentId}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "bar_orders",
        filter: `establishment_id=eq.${establishmentId}`,
      }, () => {
        addToast({
          type: "bar",
          message: "Nuovo ordine bar ricevuto",
          href: `/dashboard/${slug}/ordini-bar`,
        });
      })
      .subscribe();

    // ── Prenotazioni ──
    const bookingChannel = supabase
      .channel(`global-bookings-${establishmentId}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "bookings",
        filter: `establishment_id=eq.${establishmentId}`,
      }, (payload) => {
        const booking = payload.new as { guest_name?: string };
        addToast({
          type: "booking",
          message: `Nuova prenotazione${booking.guest_name ? ` — ${booking.guest_name}` : ""}`,
          href: `/dashboard/${slug}/prenotazioni`,
        });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(barChannel);
      supabase.removeChannel(bookingChannel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [establishmentId]);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2">
      {toasts.map((toast) => (
        <Link
          key={toast.id}
          href={toast.href}
          onClick={() => removeToast(toast.id)}
          className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 shadow-xl transition hover:opacity-90 max-w-xs"
        >
          <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${toast.type === "bar" ? "bg-orange-500/15 text-orange-500" : "bg-blue-500/15 text-blue-500"}`}>
            {toast.type === "bar" ? <ShoppingBag className="h-4 w-4" /> : <Umbrella className="h-4 w-4" />}
          </span>
          <span className="flex-1 text-sm font-medium text-foreground">{toast.message}</span>
          <button
            onClick={(e) => { e.preventDefault(); removeToast(toast.id); }}
            className="shrink-0 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </Link>
      ))}
    </div>
  );
}

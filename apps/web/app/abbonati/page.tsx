"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { Check, ShieldCheck, Zap, Users, BarChart3, MessageSquare, Loader2 } from "lucide-react";
import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";
import { Logo } from "@/components/logo";

const FEATURES = [
  { icon: Zap, text: "Mappa interattiva spiaggia con prenotazione online" },
  { icon: Users, text: "Gestione dipendenti con permessi personalizzati" },
  { icon: BarChart3, text: "Analytics: occupazione, incassi, prenotazioni" },
  { icon: MessageSquare, text: "Assistente AI per i tuoi clienti" },
  { icon: ShieldCheck, text: "QR check-in, ordini bar, servizi extra" },
  { icon: Check, text: "Email automatiche di conferma prenotazione" },
];

function AbbonatiContent() {
  const searchParams = useSearchParams();
  const slug = searchParams.get("slug") ?? "";
  const id = searchParams.get("id") ?? "";
  const [stripeLoading, setStripeLoading] = useState(false);

  async function handleStripe() {
    setStripeLoading(true);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ establishmentId: id, slug }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } finally {
      setStripeLoading(false);
    }
  }

  async function createPayPalOrder() {
    const res = await fetch("/api/paypal/create-order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ establishmentId: id }),
    });
    const data = await res.json();
    return data.orderId;
  }

  async function capturePayPalOrder(data: { orderID: string }) {
    const res = await fetch("/api/paypal/capture-order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId: data.orderID, establishmentId: id }),
    });
    const result = await res.json();
    if (result.success) {
      window.location.href = `/abbonati/success?slug=${slug}`;
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-[#0B1829] to-[#1a3a5c] px-4 py-12">
      <div className="w-full max-w-lg">
        <div className="mb-8 text-center">
          <Logo size="md" className="mx-auto mb-4" />
          <h1 className="text-2xl font-black text-white">Attiva il tuo abbonamento</h1>
          <p className="mt-2 text-white/60">
            Il tuo periodo di prova è scaduto. Continua a usare LidoFacile senza interruzioni.
          </p>
        </div>

        <div className="rounded-2xl bg-white p-8 shadow-2xl">
          {/* Prezzo */}
          <div className="mb-6 text-center">
            <div className="inline-flex items-end gap-1">
              <span className="text-5xl font-black text-[#0B1829]">497€</span>
              <span className="mb-2 text-gray-500">/anno</span>
            </div>
            <p className="mt-1 text-sm text-gray-500">IVA inclusa · Zero commissioni sulle prenotazioni</p>
          </div>

          {/* Features */}
          <ul className="mb-8 space-y-3">
            {FEATURES.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3 text-sm text-gray-700">
                <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#00F0B5]/20">
                  <Icon className="h-3 w-3 text-[#00BFFF]" />
                </div>
                {text}
              </li>
            ))}
          </ul>

          {/* Stripe */}
          <button
            onClick={handleStripe}
            disabled={stripeLoading}
            className="mb-3 flex w-full items-center justify-center gap-3 rounded-xl bg-[#0B1829] px-6 py-4 font-bold text-white transition hover:bg-[#0B1829]/80 disabled:opacity-60"
          >
            {stripeLoading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.992 3.757 7.218c0 4.039 2.467 5.76 6.476 7.219 2.585.92 3.445 1.574 3.445 2.583 0 .98-.84 1.545-2.354 1.545-1.875 0-4.965-.921-6.99-2.109l-.9 5.555C5.175 22.99 8.385 24 11.714 24c2.641 0 4.843-.624 6.328-1.813 1.664-1.305 2.525-3.236 2.525-5.732 0-4.128-2.524-5.851-6.591-7.305z"/>
              </svg>
            )}
            {stripeLoading ? "Reindirizzamento..." : "Paga con carta di credito"}
          </button>

          {/* Divider */}
          <div className="relative mb-3">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-white px-3 text-xs text-gray-400">oppure</span>
            </div>
          </div>

          {/* PayPal */}
          <PayPalScriptProvider
            options={{
              clientId: process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID!,
              currency: "EUR",
              intent: "capture",
            }}
          >
            <PayPalButtons
              style={{ layout: "horizontal", color: "gold", shape: "rect", label: "pay", height: 48 }}
              createOrder={createPayPalOrder}
              onApprove={capturePayPalOrder}
            />
          </PayPalScriptProvider>

          <p className="mt-4 text-center text-xs text-gray-400">
            Pagamento sicuro · Rinnovo annuale · Disdici in qualsiasi momento
          </p>
        </div>

        <p className="mt-6 text-center text-sm text-white/50">
          Hai bisogno di aiuto?{" "}
          <a href="mailto:info@lido-facile.it" className="text-[#00BFFF] hover:underline">
            Scrivici
          </a>
        </p>
      </div>
    </div>
  );
}

export default function AbbonatiPage() {
  return (
    <Suspense>
      <AbbonatiContent />
    </Suspense>
  );
}

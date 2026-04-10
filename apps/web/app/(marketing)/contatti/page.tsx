"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CheckCircle2, Mail, MessageSquare } from "lucide-react";

export default function ContattiPage() {
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [messaggio, setMessaggio] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const res = await fetch("/api/contatti", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nome, email, messaggio }),
    });

    if (res.ok) {
      setSent(true);
    } else {
      setError("Errore nell'invio. Prova a scriverci direttamente a info@lido-facile.it");
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-white pt-24 pb-16">
      <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8">
        <div className="mb-10">
          <Link href="/" className="text-sm text-brand-azure hover:underline">← Torna alla home</Link>
          <h1 className="mt-4 text-4xl font-black text-brand-navy">Contattaci</h1>
          <p className="mt-3 text-lg text-gray-600">
            Hai domande su LidoFacile? Vuoi una demo personalizzata? Scrivici, ti rispondiamo entro 24 ore.
          </p>
        </div>

        {sent ? (
          <div className="rounded-2xl border border-green-200 bg-green-50 p-10 text-center">
            <CheckCircle2 className="mx-auto mb-4 h-14 w-14 text-green-500" />
            <h2 className="text-2xl font-bold text-brand-navy">Messaggio inviato!</h2>
            <p className="mt-2 text-gray-600">Ti risponderemo all&apos;indirizzo <strong>{email}</strong> entro 24 ore.</p>
            <Link href="/" className="mt-6 inline-block text-sm text-brand-azure hover:underline">
              Torna alla home
            </Link>
          </div>
        ) : (
          <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Nome e cognome</label>
                <Input
                  placeholder="Mario Rossi"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Email</label>
                <Input
                  type="email"
                  placeholder="mario@lido-azzurro.it"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Messaggio</label>
                <textarea
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 min-h-[140px] resize-none"
                  placeholder="Raccontaci del tuo stabilimento e come possiamo aiutarti..."
                  value={messaggio}
                  onChange={(e) => setMessaggio(e.target.value)}
                  required
                />
              </div>
              {error && (
                <p className="text-sm text-red-600">{error}</p>
              )}
              <Button type="submit" variant="brand" size="lg" className="w-full" disabled={loading}>
                {loading ? "Invio in corso…" : (
                  <><MessageSquare className="h-4 w-4" /> Invia messaggio</>
                )}
              </Button>
            </form>

            <div className="mt-8 flex items-center gap-3 rounded-xl bg-gray-50 px-5 py-4">
              <Mail className="h-5 w-5 shrink-0 text-brand-azure" />
              <div>
                <p className="text-sm font-medium text-gray-700">Preferisci scrivere direttamente?</p>
                <a href="mailto:info@lido-facile.it" className="text-sm text-brand-azure hover:underline">
                  info@lido-facile.it
                </a>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

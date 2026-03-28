"use client";

import Link from "next/link";
import { useState } from "react";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowRight, Loader2, Check } from "lucide-react";

export default function RegisterPage() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    password: "",
    establishmentName: "",
    city: "",
  });

  function updateField(field: string, value: string) {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (step === 1) {
      setStep(2);
      return;
    }

    setLoading(true);
    try {
      // TODO: Supabase auth + create establishment
      console.log("Register:", formData);
    } catch {
      // handle error
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen">
      <div className="flex flex-1 flex-col items-center justify-center px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-sm">
          <Link href="/" className="mb-8 inline-block">
            <Logo size="md" />
          </Link>

          <h1 className="text-2xl font-bold">Crea il tuo account</h1>
          <p className="mt-2 text-base text-muted-foreground">
            {step === 1
              ? "Inserisci i tuoi dati personali."
              : "Parlaci del tuo stabilimento."}
          </p>

          {/* Progress steps */}
          <div className="mt-6 flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-azure text-sm font-bold text-white">
              {step > 1 ? <Check className="h-4 w-4" /> : "1"}
            </div>
            <div
              className={`h-0.5 flex-1 rounded-full ${step > 1 ? "bg-brand-azure" : "bg-border"}`}
            />
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${
                step === 2
                  ? "bg-brand-azure text-white"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              2
            </div>
          </div>

          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            {step === 1 ? (
              <>
                <div>
                  <label
                    htmlFor="fullName"
                    className="mb-1.5 block text-sm font-medium"
                  >
                    Nome e cognome
                  </label>
                  <Input
                    id="fullName"
                    placeholder="Mario Rossi"
                    value={formData.fullName}
                    onChange={(e) => updateField("fullName", e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label
                    htmlFor="email"
                    className="mb-1.5 block text-sm font-medium"
                  >
                    Email
                  </label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="mario@lido-azzurro.it"
                    value={formData.email}
                    onChange={(e) => updateField("email", e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label
                    htmlFor="phone"
                    className="mb-1.5 block text-sm font-medium"
                  >
                    Telefono
                  </label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="+39 333 123 4567"
                    value={formData.phone}
                    onChange={(e) => updateField("phone", e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label
                    htmlFor="password"
                    className="mb-1.5 block text-sm font-medium"
                  >
                    Password
                  </label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Minimo 8 caratteri"
                    value={formData.password}
                    onChange={(e) => updateField("password", e.target.value)}
                    required
                    minLength={8}
                  />
                </div>
              </>
            ) : (
              <>
                <div>
                  <label
                    htmlFor="establishmentName"
                    className="mb-1.5 block text-sm font-medium"
                  >
                    Nome dello stabilimento
                  </label>
                  <Input
                    id="establishmentName"
                    placeholder="Lido Azzurro"
                    value={formData.establishmentName}
                    onChange={(e) =>
                      updateField("establishmentName", e.target.value)
                    }
                    required
                  />
                </div>
                <div>
                  <label
                    htmlFor="city"
                    className="mb-1.5 block text-sm font-medium"
                  >
                    Citta
                  </label>
                  <Input
                    id="city"
                    placeholder="Rimini"
                    value={formData.city}
                    onChange={(e) => updateField("city", e.target.value)}
                    required
                  />
                </div>
              </>
            )}

            <Button
              type="submit"
              variant="brand"
              size="lg"
              className="w-full"
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : step === 1 ? (
                <>
                  Continua
                  <ArrowRight className="h-5 w-5" />
                </>
              ) : (
                <>
                  Crea account gratuito
                  <ArrowRight className="h-5 w-5" />
                </>
              )}
            </Button>

            {step === 2 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="w-full"
                onClick={() => setStep(1)}
              >
                Torna indietro
              </Button>
            )}
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Hai gia un account?{" "}
            <Link
              href="/auth/login"
              className="font-medium text-brand-azure hover:underline"
            >
              Accedi
            </Link>
          </p>
        </div>
      </div>

      {/* Colonna destra */}
      <div className="hidden flex-1 items-center justify-center bg-brand-navy lg:flex">
        <div className="max-w-md text-center">
          <Logo size="lg" variant="icon" className="mx-auto mb-8" />
          <h2 className="text-3xl font-bold text-white">
            14 giorni{" "}
            <span className="text-brand-gradient">gratis</span>
          </h2>
          <p className="mt-4 text-lg text-white/60">
            Prova tutte le funzionalita senza impegno. Nessuna carta di credito
            richiesta.
          </p>
          <div className="mt-8 space-y-3 text-left">
            {[
              "Mappa interattiva della spiaggia",
              "Prenotazioni online illimitate",
              "Zero commissioni sui pagamenti",
              "Assistente AI integrato",
            ].map((feature) => (
              <div
                key={feature}
                className="flex items-center gap-3 text-white/70"
              >
                <Check className="h-5 w-5 shrink-0 text-brand-cyan" />
                <span>{feature}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

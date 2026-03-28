"use client";

import Link from "next/link";
import { useState } from "react";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowRight, Loader2 } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // TODO: Supabase auth
      console.log("Login:", { email, password });
    } catch {
      setError("Credenziali non valide. Riprova.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen">
      {/* Colonna sinistra — Form */}
      <div className="flex flex-1 flex-col items-center justify-center px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-sm">
          <Link href="/" className="mb-8 inline-block">
            <Logo size="md" />
          </Link>

          <h1 className="text-2xl font-bold">Accedi al tuo account</h1>
          <p className="mt-2 text-base text-muted-foreground">
            Gestisci il tuo stabilimento da qui.
          </p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            {error && (
              <div className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {error}
              </div>
            )}

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
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
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
                placeholder="La tua password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>

            <Button
              type="submit"
              variant="brand"
              size="lg"
              className="w-full"
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  Accedi
                  <ArrowRight className="h-5 w-5" />
                </>
              )}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Non hai un account?{" "}
            <Link
              href="/auth/registrati"
              className="font-medium text-brand-azure hover:underline"
            >
              Registrati gratis
            </Link>
          </p>
        </div>
      </div>

      {/* Colonna destra — Visual */}
      <div className="hidden flex-1 items-center justify-center bg-brand-navy lg:flex">
        <div className="max-w-md text-center">
          <Logo size="lg" variant="icon" className="mx-auto mb-8" />
          <h2 className="text-3xl font-bold text-white">
            La tua spiaggia,{" "}
            <span className="text-brand-gradient">gestita facile</span>
          </h2>
          <p className="mt-4 text-lg text-white/60">
            Prenotazioni, pagamenti e mappa interattiva. Tutto in un unico
            posto.
          </p>
        </div>
      </div>
    </div>
  );
}

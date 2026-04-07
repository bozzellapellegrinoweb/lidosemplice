"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowRight, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const supabase = createClient();

      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        setError(
          authError.message === "Invalid login credentials"
            ? "Email o password non corretti."
            : authError.message
        );
        return;
      }

      // Trova lo stabilimento dell'utente
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setError("Errore durante il login.");
        return;
      }

      // Super admin? Vai a /admin
      const superAdminEmails = ["info@lido-facile.it"];
      if (superAdminEmails.includes(user.email || "")) {
        window.location.href = "/admin";
        return;
      }

      // Cerca stabilimento di proprietà
      const { data: owned } = await supabase
        .from("establishments")
        .select("slug")
        .eq("owner_id", user.id)
        .limit(1)
        .single();

      if (owned?.slug) {
        window.location.href = `/dashboard/${owned.slug}`;
        return;
      }

      // Cerca come membro
      const { data: membership } = await supabase
        .from("establishment_members")
        .select("establishment_id, establishments(slug)")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .limit(1)
        .single();

      if (membership?.establishments) {
        const est = membership.establishments as unknown as { slug: string };
        window.location.href = `/dashboard/${est.slug}`;
        return;
      }

      // Nessuno stabilimento
      window.location.href = "/dashboard/nuovo";
    } catch {
      setError("Si è verificato un errore. Riprova.");
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
              <div className="mb-1.5 flex items-center justify-between">
                <label htmlFor="password" className="text-sm font-medium">Password</label>
                <Link href="/auth/forgot-password" className="text-xs text-brand-azure hover:underline">
                  Password dimenticata?
                </Link>
              </div>
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
            Il tuo stabilimento,{" "}
            <span className="text-brand-gradient">gestito facile.</span>
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

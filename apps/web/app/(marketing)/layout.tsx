import Link from "next/link";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen">
      {/* Navbar */}
      <header className="fixed top-0 z-50 w-full border-b border-white/10 bg-brand-navy/80 backdrop-blur-xl">
        <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center">
            <Logo size="sm" />
          </Link>

          <div className="hidden items-center gap-8 md:flex">
            <Link
              href="#funzionalita"
              className="text-sm font-medium text-white/70 transition-colors hover:text-white"
            >
              Funzionalita
            </Link>
            <Link
              href="#prezzi"
              className="text-sm font-medium text-white/70 transition-colors hover:text-white"
            >
              Prezzi
            </Link>
            <Link
              href="#demo"
              className="text-sm font-medium text-white/70 transition-colors hover:text-white"
            >
              Demo
            </Link>
            <Link
              href="#contatti"
              className="text-sm font-medium text-white/70 transition-colors hover:text-white"
            >
              Contatti
            </Link>
          </div>

          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/auth/login" className="text-white">
                Accedi
              </Link>
            </Button>
            <Button variant="brand" size="sm" asChild>
              <Link href="/auth/registrati">Prova gratis</Link>
            </Button>
          </div>
        </nav>
      </header>

      <main>{children}</main>

      {/* Footer */}
      <footer className="border-t border-white/10 bg-brand-navy">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="grid gap-8 md:grid-cols-4">
            <div>
              <Logo size="sm" />
              <p className="mt-4 text-sm text-white/50">
                Il gestionale semplice per la tua spiaggia. Zero commissioni,
                tutto incluso.
              </p>
            </div>
            <div>
              <h3 className="mb-4 text-sm font-semibold text-white">
                Prodotto
              </h3>
              <ul className="space-y-2 text-sm text-white/50">
                <li>
                  <Link href="#funzionalita" className="hover:text-white">
                    Funzionalita
                  </Link>
                </li>
                <li>
                  <Link href="#prezzi" className="hover:text-white">
                    Prezzi
                  </Link>
                </li>
                <li>
                  <Link href="#demo" className="hover:text-white">
                    Demo
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="mb-4 text-sm font-semibold text-white">
                Supporto
              </h3>
              <ul className="space-y-2 text-sm text-white/50">
                <li>
                  <Link href="#contatti" className="hover:text-white">
                    Contatti
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:text-white">
                    Guide
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="mb-4 text-sm font-semibold text-white">Legale</h3>
              <ul className="space-y-2 text-sm text-white/50">
                <li>
                  <Link href="#" className="hover:text-white">
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:text-white">
                    Termini di Servizio
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:text-white">
                    Cookie Policy
                  </Link>
                </li>
              </ul>
            </div>
          </div>
          <div className="mt-8 border-t border-white/10 pt-8 text-center text-sm text-white/30">
            &copy; {new Date().getFullYear()} LidoFacile.it — Tutti i diritti
            riservati.
          </div>
        </div>
      </footer>
    </div>
  );
}

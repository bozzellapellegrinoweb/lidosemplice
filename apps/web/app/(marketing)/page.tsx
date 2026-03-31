import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Umbrella,
  CreditCard,
  BarChart3,
  QrCode,
  UtensilsCrossed,
  MessageCircle,
  Smartphone,
  Users,
  Shield,
  Zap,
  Check,
  ArrowRight,
  Star,
} from "lucide-react";

export default function HomePage() {
  return (
    <>
      {/* ===== HERO SECTION ===== */}
      <section className="relative overflow-hidden pt-16" style={{ background: "linear-gradient(180deg, #0c2d48 0%, #143d5e 20%, #1a6085 38%, #2e94b9 48%, #6dc0d9 56%, #b4dce8 62%, #e8d5b7 70%, #dfc09a 80%, #d4b08a 90%, #c9a06e 100%)" }}>
        {/* Texture sabbia nella parte bassa */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.12]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='200' height='200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E")`,
            backgroundSize: "200px 200px",
          }}
        />

        {/* Granelli di sabbia nella parte bassa */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div
            className="absolute bottom-0 left-0 right-0 h-[35%] opacity-20"
            style={{
              backgroundImage: "radial-gradient(circle, #c4956a 1px, transparent 1px), radial-gradient(circle, #b8845a 0.5px, transparent 0.5px)",
              backgroundSize: "24px 24px, 40px 40px",
              backgroundPosition: "0 0, 12px 12px",
            }}
          />
        </div>

        {/* Onde del mare animate — posizionate nella zona di transizione mare/sabbia */}
        <div className="pointer-events-none absolute inset-x-0 bottom-[22%] h-[200px]">
          <svg className="absolute inset-0 h-full w-full" viewBox="0 0 1440 200" preserveAspectRatio="none">
            <defs>
              <linearGradient id="seaDeep" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#2980b9" stopOpacity="0.5" />
                <stop offset="100%" stopColor="#5dade2" stopOpacity="0.1" />
              </linearGradient>
              <linearGradient id="seaMid" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#5dade2" stopOpacity="0.35" />
                <stop offset="100%" stopColor="#85c1e9" stopOpacity="0.05" />
              </linearGradient>
              <linearGradient id="seaFoam" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#aed6f1" stopOpacity="0.6" />
                <stop offset="50%" stopColor="#d4effc" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
              </linearGradient>
              <linearGradient id="foamWhite" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#ffffff" stopOpacity="0.5" />
                <stop offset="50%" stopColor="#ffffff" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#ffffff" stopOpacity="0.5" />
              </linearGradient>
            </defs>

            {/* Onda profonda */}
            <path
              className="animate-wave-deep"
              d="M0,40 C120,20 240,60 360,45 C480,30 600,65 720,50 C840,35 960,70 1080,55 C1200,40 1320,25 1440,45 L1440,200 L0,200 Z"
              fill="url(#seaDeep)"
            />
            {/* Onda media */}
            <path
              className="animate-wave-mid"
              d="M0,70 C100,55 200,85 360,72 C520,58 600,90 720,78 C840,65 960,95 1080,82 C1200,68 1340,60 1440,75 L1440,200 L0,200 Z"
              fill="url(#seaMid)"
            />
            {/* Onda schiuma */}
            <path
              className="animate-wave-foam"
              d="M0,95 C80,88 160,105 320,97 C480,89 560,108 720,100 C880,92 960,110 1080,102 C1200,94 1360,86 1440,97 L1440,130 L0,130 Z"
              fill="url(#seaFoam)"
            />
            {/* Cresta bianca schiuma */}
            <path
              className="animate-wave-crest"
              d="M0,97 C60,93 120,101 240,97 C360,93 420,103 540,99 C660,95 720,104 840,100 C960,96 1020,103 1140,99 C1260,95 1380,92 1440,97 L1440,102 L0,102 Z"
              fill="url(#foamWhite)"
            />
          </svg>
        </div>

        {/* Riflessi luce sull'acqua (parte alta) */}
        <div className="pointer-events-none absolute inset-x-0 top-[15%] h-[30%] opacity-[0.04]">
          <div
            className="animate-shimmer h-full w-full"
            style={{
              backgroundImage: "radial-gradient(ellipse 100px 2px, white, transparent), radial-gradient(ellipse 70px 1.5px, white, transparent), radial-gradient(ellipse 120px 3px, white, transparent)",
              backgroundSize: "220px 45px, 320px 65px, 270px 55px",
              backgroundPosition: "0 0, 50px 20px, 100px 10px",
            }}
          />
        </div>

        <div className="relative mx-auto max-w-7xl px-4 pb-24 pt-24 sm:px-6 sm:pb-32 sm:pt-32 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            {/* Badge */}
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium text-white backdrop-blur-sm">
              <Zap className="h-4 w-4" />
              Pronto in 10 minuti — Zero commissioni
            </div>

            <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl">
              Il tuo stabilimento,{" "}
              <span className="text-brand-gradient">gestito facile.</span>
            </h1>

            <p className="mx-auto mt-6 max-w-2xl text-lg text-white/70 sm:text-xl">
              Prenotazioni online, mappa interattiva degli ombrelloni, pagamenti
              integrati e assistente AI. Tutto in un unico gestionale pensato
              per il tuo stabilimento.
            </p>

            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Button variant="brand" size="xl" asChild>
                <Link href="/auth/registrati">
                  Prova gratis 14 giorni
                  <ArrowRight className="h-5 w-5" />
                </Link>
              </Button>
              <Button
                size="lg"
                className="border border-white/20 bg-white/10 text-white backdrop-blur-sm hover:bg-white/20"
                asChild
              >
                <Link href="/lido/lido-azzurro">Guarda la demo</Link>
              </Button>
            </div>

            <p className="mt-4 text-sm text-white/40">
              Nessuna carta di credito richiesta
            </p>
          </div>

          {/* Hero image placeholder — mappa interattiva */}
          <div className="mx-auto mt-16 max-w-5xl">
            <div className="overflow-hidden rounded-2xl border border-white/10 bg-brand-navy-light shadow-2xl shadow-brand-azure/10">
              <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3">
                <div className="h-3 w-3 rounded-full bg-red-500" />
                <div className="h-3 w-3 rounded-full bg-yellow-500" />
                <div className="h-3 w-3 rounded-full bg-green-500" />
                <span className="ml-2 text-xs text-white/40">
                  dashboard.lido-facile.it/lido-azzurro/mappa
                </span>
              </div>
              {/* Anteprima mappa stabilimento */}
              <div className="relative p-6">
                {/* Mare */}
                <div className="mb-4 flex h-16 items-center justify-center rounded-lg bg-gradient-to-r from-brand-cyan/20 via-brand-azure/20 to-brand-blue/20">
                  <span className="text-sm font-medium text-brand-azure">
                    MARE
                  </span>
                </div>
                {/* File ombrelloni */}
                <div className="space-y-3">
                  {["Prima fila", "Seconda fila", "Terza fila"].map(
                    (fila, rowIndex) => (
                      <div key={fila} className="flex items-center gap-3">
                        <span className="w-24 text-right text-xs text-white/40">
                          {fila}
                        </span>
                        <div className="flex flex-1 gap-2">
                          {Array.from({ length: 10 }, (_, i) => {
                            const states = [
                              "available",
                              "occupied",
                              "available",
                              "selected",
                              "available",
                              "occupied",
                              "available",
                              "available",
                              "partial",
                              "available",
                            ];
                            const stateRow2 = [
                              "occupied",
                              "available",
                              "available",
                              "available",
                              "occupied",
                              "available",
                              "selected",
                              "available",
                              "available",
                              "occupied",
                            ];
                            const stateRow3 = [
                              "available",
                              "available",
                              "occupied",
                              "available",
                              "available",
                              "available",
                              "available",
                              "occupied",
                              "available",
                              "available",
                            ];
                            const s =
                              rowIndex === 0
                                ? states[i]
                                : rowIndex === 1
                                  ? stateRow2[i]
                                  : stateRow3[i];
                            const colors = {
                              available:
                                "bg-available/20 border-available/40 hover:bg-available/30",
                              occupied:
                                "bg-occupied/20 border-occupied/40 opacity-60",
                              selected:
                                "bg-brand-azure/30 border-brand-azure ring-2 ring-brand-azure/50",
                              partial:
                                "bg-partial/20 border-partial/40",
                            };
                            return (
                              <div
                                key={i}
                                className={`flex h-10 w-10 items-center justify-center rounded-lg border text-xs font-medium text-white/60 transition-all sm:h-12 sm:w-12 ${colors[s as keyof typeof colors]}`}
                              >
                                <Umbrella className="h-4 w-4" />
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )
                  )}
                </div>
                {/* Legenda */}
                <div className="mt-4 flex items-center justify-center gap-6 text-xs text-white/40">
                  <span className="flex items-center gap-1.5">
                    <span className="h-3 w-3 rounded-full bg-available/40" />
                    Disponibile
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="h-3 w-3 rounded-full bg-occupied/40" />
                    Occupato
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="h-3 w-3 rounded-full bg-brand-azure" />
                    Selezionato
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="h-3 w-3 rounded-full bg-partial/40" />
                    Mezza giornata
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== PROBLEMA / SOLUZIONE ===== */}
      <section className="bg-background py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-3xl font-bold sm:text-4xl">
              Basta fogli di carta e telefonate infinite
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Il 60% degli stabilimenti italiani gestisce ancora le prenotazioni
              a mano. Con LidoFacile tutto diventa digitale, semplice e
              veloce.
            </p>
          </div>
        </div>
      </section>

      {/* ===== FUNZIONALITA ===== */}
      <section id="funzionalita" className="bg-muted/50 py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-3xl font-bold sm:text-4xl">
              Tutto quello che ti serve,{" "}
              <span className="text-brand-gradient">niente di piu</span>
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Pensato per gestori di stabilimenti balneari. Semplice da usare,
              potente nei risultati.
            </p>
          </div>

          <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                icon: Umbrella,
                title: "Mappa interattiva",
                description:
                  "Disegna la mappa del tuo stabilimento con drag & drop. Spiaggia, giardino, piscina — i clienti scelgono il posto come in aereo.",
              },
              {
                icon: CreditCard,
                title: "Pagamenti online",
                description:
                  "Accetta carte, PayPal, Satispay, Revolut e altro. Zero commissioni da parte nostra — il 100% va a te.",
              },
              {
                icon: QrCode,
                title: "Check-in con QR",
                description:
                  "Il cliente mostra il QR code, tu scansioni. Check-in istantaneo, mappa aggiornata in tempo reale.",
              },
              {
                icon: UtensilsCrossed,
                title: "Ordini dal bar",
                description:
                  "Il cliente ordina dal telefono indicando il numero dell'ombrellone. Tu ricevi l'ordine subito.",
              },
              {
                icon: MessageCircle,
                title: "Assistente AI",
                description:
                  'Il cliente chiede "Hai un posto in prima fila sabato?" e l\'AI risponde con disponibilita reale.',
              },
              {
                icon: BarChart3,
                title: "Statistiche",
                description:
                  "Occupazione, incassi, prenotazioni. Tutto a colpo d'occhio nella tua dashboard.",
              },
              {
                icon: Smartphone,
                title: "Funziona su telefono",
                description:
                  "Installabile come un'app dal browser. Niente da scaricare dall'App Store.",
              },
              {
                icon: Users,
                title: "Gestisci il team",
                description:
                  "Invita i tuoi dipendenti con permessi personalizzati. Ognuno vede solo quello che gli serve.",
              },
              {
                icon: Shield,
                title: "Dati protetti",
                description:
                  "I tuoi dati sono al sicuro con crittografia end-to-end e backup automatici giornalieri.",
              },
            ].map((feature) => (
              <Card
                key={feature.title}
                className="group border-0 bg-card shadow-sm transition-all duration-300 hover:shadow-lg hover:-translate-y-1"
              >
                <CardContent className="p-6">
                  <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-brand-azure/10 text-brand-azure transition-colors group-hover:bg-brand-azure group-hover:text-white">
                    <feature.icon className="h-6 w-6" />
                  </div>
                  <h3 className="mb-2 text-lg font-semibold">
                    {feature.title}
                  </h3>
                  <p className="text-base text-muted-foreground">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ===== COME FUNZIONA ===== */}
      <section className="bg-background py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-3xl font-bold sm:text-4xl">
              Pronto in 3 passi
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Non serve essere esperti di tecnologia. Se sai usare WhatsApp, sai
              usare LidoFacile.
            </p>
          </div>

          <div className="mt-16 grid gap-8 md:grid-cols-3">
            {[
              {
                step: "1",
                title: "Disegna il tuo stabilimento",
                description:
                  "Usa il nostro editor visuale o scegli un template. Trascina ombrelloni, lettini e servizi sulla mappa.",
              },
              {
                step: "2",
                title: "Imposta i prezzi",
                description:
                  "Definisci le tariffe per fila e stagione. Prezzi diversi per giorno, settimana o mese. Aggiungi servizi extra.",
              },
              {
                step: "3",
                title: "Inizia a incassare",
                description:
                  "Collega i pagamenti in 2 minuti: carte, PayPal, Satispay, Revolut. I clienti prenotano e pagano direttamente dal telefono.",
              },
            ].map((item) => (
              <div key={item.step} className="relative text-center">
                <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-gradient text-2xl font-bold text-white shadow-lg shadow-brand-azure/25">
                  {item.step}
                </div>
                <h3 className="mb-3 text-xl font-semibold">{item.title}</h3>
                <p className="text-base text-muted-foreground">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== PREZZI ===== */}
      <section id="prezzi" className="bg-brand-navy py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-3xl font-bold text-white sm:text-4xl">
              Un prezzo,{" "}
              <span className="text-brand-gradient">tutto incluso</span>
            </h2>
            <p className="mt-4 text-lg text-white/70">
              Nessuna commissione sulle prenotazioni. Nessun costo nascosto. Mai.
            </p>
          </div>

          <div className="mx-auto mt-16 max-w-lg">
            <Card className="relative overflow-hidden border-2 border-brand-azure/30 bg-brand-navy-light">
              {/* Badge popolare */}
              <div className="absolute right-4 top-4">
                <span className="inline-flex items-center gap-1 rounded-full bg-brand-gradient px-3 py-1 text-xs font-semibold text-white">
                  <Star className="h-3 w-3" /> Piu scelto
                </span>
              </div>

              <CardContent className="p-8">
                <h3 className="text-lg font-medium text-white/70">
                  Piano Annuale
                </h3>
                <div className="mt-4 flex items-baseline gap-1">
                  <span className="text-5xl font-bold text-white">497</span>
                  <span className="text-xl text-white/50">&euro;/anno</span>
                </div>
                <p className="mt-2 text-sm text-white/40">
                  Equivale a meno di 1,37 &euro; al giorno
                </p>

                <div className="mt-8 space-y-4">
                  {[
                    "Mappa interattiva illimitata",
                    "Prenotazioni online illimitate",
                    "Zero commissioni sui pagamenti",
                    "Ordini bar dall'ombrellone",
                    "Assistente AI integrato",
                    "Check-in con QR code",
                    "Dashboard statistiche",
                    "Gestione dipendenti",
                    "Supporto WhatsApp dedicato",
                    "Aggiornamenti inclusi",
                  ].map((feature) => (
                    <div
                      key={feature}
                      className="flex items-center gap-3 text-white/80"
                    >
                      <Check className="h-5 w-5 shrink-0 text-brand-cyan" />
                      <span className="text-base">{feature}</span>
                    </div>
                  ))}
                </div>

                <Button variant="brand" size="xl" className="mt-8 w-full" asChild>
                  <Link href="/auth/registrati">
                    Inizia la prova gratuita
                    <ArrowRight className="h-5 w-5" />
                  </Link>
                </Button>

                <p className="mt-4 text-center text-sm text-white/40">
                  14 giorni gratis, poi 497 &euro;/anno. Disdici quando vuoi.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* ===== CTA FINALE ===== */}
      <section id="contatti" className="bg-background py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-3xl font-bold sm:text-4xl">
              Pronto per la stagione 2026?
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Unisciti agli stabilimenti che hanno scelto la semplicita. Attiva
              LidoFacile in 10 minuti e inizia a ricevere prenotazioni.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Button variant="brand" size="xl" asChild>
                <Link href="/auth/registrati">
                  Prova gratis 14 giorni
                  <ArrowRight className="h-5 w-5" />
                </Link>
              </Button>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              Hai domande? Scrivici su WhatsApp al{" "}
              <a
                href="tel:+39000000000"
                className="font-medium text-brand-azure hover:underline"
              >
                +39 000 000 0000
              </a>
            </p>
          </div>
        </div>
      </section>
    </>
  );
}

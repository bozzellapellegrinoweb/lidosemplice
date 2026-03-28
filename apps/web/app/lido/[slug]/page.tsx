import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  MapPin,
  Clock,
  Phone,
  Mail,
  Umbrella,
  ArrowRight,
  Star,
} from "lucide-react";

// Dati mock per demo — in produzione verranno dal database
const MOCK_ESTABLISHMENT = {
  name: "Lido Azzurro",
  slug: "lido-azzurro",
  description:
    "Il tuo angolo di paradiso sulla costa adriatica. Ombrelloni, lettini, bar e ristorante direttamente sulla spiaggia.",
  address: "Lungomare Cristoforo Colombo, 45",
  city: "Rimini",
  province: "RN",
  phone: "+39 0541 123456",
  email: "info@lidoazzurro.it",
  check_in_time: "08:00",
  check_out_time: "19:00",
  primary_color: "#00BFFF",
  cover_image_url: null,
  services: [
    { name: "Asciugamano mare", price: 15, icon: "towel" },
    { name: "Doccia calda", price: 2, icon: "shower" },
    { name: "Wifi gratuito", price: 0, icon: "wifi" },
    { name: "Parcheggio", price: 5, icon: "parking" },
  ],
  rows: [
    { label: "Prima fila", price_from: 45 },
    { label: "Seconda fila", price_from: 35 },
    { label: "Terza fila", price_from: 25 },
    { label: "Quarta fila", price_from: 20 },
  ],
};

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function LidoPage({ params }: PageProps) {
  const { slug } = await params;
  // TODO: fetch establishment from Supabase by slug
  const establishment = MOCK_ESTABLISHMENT;

  return (
    <div className="min-h-screen bg-background">
      {/* Header stabilimento */}
      <header className="relative bg-brand-navy">
        {/* Cover image o gradiente */}
        <div className="absolute inset-0 bg-gradient-to-br from-brand-navy via-brand-navy-light to-brand-blue/30" />

        <div className="relative mx-auto max-w-5xl px-4 pb-12 pt-8 sm:px-6">
          {/* Nav */}
          <nav className="mb-8 flex items-center justify-between">
            <h2 className="text-lg font-bold text-white">
              {establishment.name}
            </h2>
            <Button variant="brand" size="sm" asChild>
              <Link href={`/lido/${slug}/prenota`}>
                Prenota ora
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </nav>

          {/* Hero stabilimento */}
          <div className="max-w-2xl">
            <div className="mb-4 flex items-center gap-2 text-sm text-white/60">
              <MapPin className="h-4 w-4" />
              <span>
                {establishment.address}, {establishment.city} (
                {establishment.province})
              </span>
            </div>

            <h1 className="text-3xl font-bold text-white sm:text-4xl">
              {establishment.name}
            </h1>

            <p className="mt-4 text-lg text-white/70">
              {establishment.description}
            </p>

            <div className="mt-6 flex flex-wrap gap-4 text-sm text-white/50">
              <span className="flex items-center gap-1.5">
                <Clock className="h-4 w-4" />
                {establishment.check_in_time} - {establishment.check_out_time}
              </span>
              <span className="flex items-center gap-1.5">
                <Phone className="h-4 w-4" />
                {establishment.phone}
              </span>
              <span className="flex items-center gap-1.5">
                <Mail className="h-4 w-4" />
                {establishment.email}
              </span>
            </div>

            <div className="mt-8">
              <Button variant="brand" size="xl" asChild>
                <Link href={`/lido/${slug}/prenota`}>
                  Scegli il tuo ombrellone
                  <Umbrella className="h-5 w-5" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Prezzi per fila */}
      <section className="py-12">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <h2 className="mb-6 text-2xl font-bold">Tariffe giornaliere</h2>
          <p className="mb-8 text-muted-foreground">
            Ombrellone + 2 lettini. Prezzi a partire da:
          </p>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {establishment.rows.map((row, i) => (
              <Card
                key={row.label}
                className={`transition-all hover:shadow-md ${i === 0 ? "border-brand-azure/30 ring-1 ring-brand-azure/20" : ""}`}
              >
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">
                        {row.label}
                      </p>
                      <p className="mt-1 text-2xl font-bold">
                        {row.price_from}&euro;
                        <span className="text-sm font-normal text-muted-foreground">
                          /giorno
                        </span>
                      </p>
                    </div>
                    {i === 0 && (
                      <span className="flex items-center gap-1 rounded-full bg-brand-azure/10 px-2 py-1 text-xs font-medium text-brand-azure">
                        <Star className="h-3 w-3" /> Vista mare
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Servizi */}
      <section className="border-t bg-muted/50 py-12">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <h2 className="mb-6 text-2xl font-bold">Servizi disponibili</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {establishment.services.map((service) => (
              <div
                key={service.name}
                className="flex items-center justify-between rounded-lg border bg-card p-4"
              >
                <span className="font-medium">{service.name}</span>
                <span className="text-lg font-semibold">
                  {service.price === 0 ? (
                    <span className="text-available">Gratis</span>
                  ) : (
                    <>{service.price}&euro;</>
                  )}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-12">
        <div className="mx-auto max-w-5xl px-4 text-center sm:px-6">
          <h2 className="text-2xl font-bold">Prenota il tuo posto</h2>
          <p className="mt-2 text-muted-foreground">
            Scegli il tuo ombrellone dalla mappa interattiva e paga online in
            pochi secondi.
          </p>
          <Button variant="brand" size="xl" className="mt-6" asChild>
            <Link href={`/lido/${slug}/prenota`}>
              Vai alla mappa
              <ArrowRight className="h-5 w-5" />
            </Link>
          </Button>
        </div>
      </section>

      {/* Footer mini */}
      <footer className="border-t py-6 text-center text-sm text-muted-foreground">
        <p>
          {establishment.name} &middot; {establishment.address},{" "}
          {establishment.city}
        </p>
        <p className="mt-1">
          Gestito con{" "}
          <Link
            href="/"
            className="font-medium text-brand-azure hover:underline"
          >
            LidoFacile.it
          </Link>
        </p>
      </footer>
    </div>
  );
}

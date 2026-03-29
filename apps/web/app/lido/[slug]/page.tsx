import Link from "next/link";
import { notFound } from "next/navigation";
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
  UtensilsCrossed,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function LidoPage({ params }: PageProps) {
  const { slug } = await params;
  const supabase = await createClient();

  // Fetch establishment
  const { data: establishment } = await supabase
    .from("establishments")
    .select("*")
    .eq("slug", slug)
    .eq("is_active", true)
    .single();

  if (!establishment) {
    notFound();
  }

  // Fetch additional services
  const { data: services } = await supabase
    .from("additional_services")
    .select("*")
    .eq("establishment_id", establishment.id)
    .eq("is_active", true)
    .order("sort_order");

  // Fetch rows for all active maps
  const { data: mapsData } = await supabase
    .from("beach_maps")
    .select("id, name")
    .eq("establishment_id", establishment.id)
    .eq("is_active", true)
    .order("created_at");

  let rows: { label: string; count: number; zoneName: string }[] = [];
  if (mapsData && mapsData.length > 0) {
    const mapIds = mapsData.map((m) => m.id);
    const { data: mapRows } = await supabase
      .from("map_rows")
      .select("id, label, row_number, beach_map_id")
      .in("beach_map_id", mapIds)
      .order("row_number");

    if (mapRows) {
      for (const row of mapRows) {
        const { count } = await supabase
          .from("map_elements")
          .select("*", { count: "exact", head: true })
          .eq("map_row_id", row.id)
          .eq("is_active", true);

        const mapName = mapsData.find((m) => m.id === row.beach_map_id)?.name || "";
        rows.push({ label: row.label, count: count || 0, zoneName: mapName });
      }
    }
  }

  // Structured data for Google
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BeachResort",
    name: establishment.name,
    description: establishment.description || `Stabilimento balneare ${establishment.name}`,
    ...(establishment.address && {
      address: {
        "@type": "PostalAddress",
        streetAddress: establishment.address,
        addressLocality: establishment.city || "",
        addressRegion: establishment.province || "",
        postalCode: establishment.cap || "",
        addressCountry: "IT",
      },
    }),
    ...(establishment.phone && { telephone: establishment.phone }),
    ...(establishment.email && { email: establishment.email }),
    ...(establishment.website && { url: establishment.website }),
    ...(establishment.latitude && establishment.longitude && {
      geo: {
        "@type": "GeoCoordinates",
        latitude: establishment.latitude,
        longitude: establishment.longitude,
      },
    }),
    ...(establishment.check_in_time && establishment.check_out_time && {
      openingHours: `Mo-Su ${establishment.check_in_time}-${establishment.check_out_time}`,
    }),
    potentialAction: {
      "@type": "ReserveAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `https://lidofacile.it/lido/${slug}/prenota`,
        actionPlatform: [
          "http://schema.org/DesktopWebPlatform",
          "http://schema.org/MobileWebPlatform",
        ],
      },
      result: {
        "@type": "Reservation",
        name: `Prenotazione ${establishment.name}`,
      },
    },
  };

  return (
    <div className="min-h-screen bg-background">
      {/* JSON-LD Structured Data for Google */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Header stabilimento */}
      <header className="relative bg-brand-navy">
        <div className="absolute inset-0 bg-gradient-to-br from-brand-navy via-brand-navy-light to-brand-blue/30" />

        <div className="relative mx-auto max-w-5xl px-4 pb-12 pt-8 sm:px-6">
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

          <div className="max-w-2xl">
            {(establishment.address || establishment.city) && (
              <div className="mb-4 flex items-center gap-2 text-sm text-white/60">
                <MapPin className="h-4 w-4" />
                <span>
                  {establishment.address && `${establishment.address}, `}
                  {establishment.city}
                  {establishment.province && ` (${establishment.province})`}
                </span>
              </div>
            )}

            <h1 className="text-3xl font-bold text-white sm:text-4xl">
              {establishment.name}
            </h1>

            {establishment.description && (
              <p className="mt-4 text-lg text-white/70">
                {establishment.description}
              </p>
            )}

            <div className="mt-6 flex flex-wrap gap-4 text-sm text-white/50">
              {establishment.check_in_time && (
                <span className="flex items-center gap-1.5">
                  <Clock className="h-4 w-4" />
                  {establishment.check_in_time} - {establishment.check_out_time}
                </span>
              )}
              {establishment.phone && (
                <span className="flex items-center gap-1.5">
                  <Phone className="h-4 w-4" />
                  {establishment.phone}
                </span>
              )}
              {establishment.email && (
                <span className="flex items-center gap-1.5">
                  <Mail className="h-4 w-4" />
                  {establishment.email}
                </span>
              )}
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              <Button variant="brand" size="xl" asChild>
                <Link href={`/lido/${slug}/prenota`}>
                  Scegli il tuo ombrellone
                  <Umbrella className="h-5 w-5" />
                </Link>
              </Button>
              <Button size="xl" className="border border-white/30 bg-white/10 text-white backdrop-blur-sm hover:bg-white/20" asChild>
                <Link href={`/lido/${slug}/menu`}>
                  <UtensilsCrossed className="h-5 w-5" />
                  Ordina dal bar
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Mappa info */}
      {rows.length > 0 && (
        <section className="py-12">
          <div className="mx-auto max-w-5xl px-4 sm:px-6">
            <h2 className="mb-6 text-2xl font-bold">Il nostro stabilimento</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {rows.map((row, i) => (
                <Card
                  key={row.label}
                  className={`transition-all hover:shadow-md ${i === 0 ? "border-brand-azure/30 ring-1 ring-brand-azure/20" : ""}`}
                >
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">{row.label}</p>
                        <p className="mt-1 text-2xl font-bold">
                          {row.count}
                          <span className="text-sm font-normal text-muted-foreground">
                            {" "}ombrelloni
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
      )}

      {/* Servizi */}
      {services && services.length > 0 && (
        <section className="border-t bg-muted/50 py-12">
          <div className="mx-auto max-w-5xl px-4 sm:px-6">
            <h2 className="mb-6 text-2xl font-bold">Servizi disponibili</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {services.map((service) => (
                <div
                  key={service.id}
                  className="flex items-center justify-between rounded-lg border bg-card p-4"
                >
                  <div>
                    <span className="font-medium">{service.name}</span>
                    {service.description && (
                      <p className="text-sm text-muted-foreground">{service.description}</p>
                    )}
                  </div>
                  <span className="text-lg font-semibold">
                    {service.price_cents === 0 ? (
                      <span className="text-available">Gratis</span>
                    ) : (
                      <>{(service.price_cents / 100).toFixed(2)}&euro;</>
                    )}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

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
          {establishment.name}
          {establishment.address && ` · ${establishment.address}`}
          {establishment.city && `, ${establishment.city}`}
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

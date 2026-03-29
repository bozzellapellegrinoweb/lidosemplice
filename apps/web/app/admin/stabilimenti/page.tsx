import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Building2,
  CheckCircle2,
  Clock,
  ArrowRight,
  MapPin,
  Umbrella,
  CalendarDays,
  ExternalLink,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";

export default async function AdminStabilimenti() {
  const supabase = await createClient();

  const { data: establishments } = await supabase
    .from("establishments")
    .select("*")
    .order("created_at", { ascending: false });

  // Per ogni stabilimento, conta elementi mappa e prenotazioni
  const enriched = await Promise.all(
    (establishments || []).map(async (est) => {
      const { count: bookingsCount } = await supabase
        .from("bookings")
        .select("*", { count: "exact", head: true })
        .eq("establishment_id", est.id)
        .neq("status", "cancelled");

      const { data: maps } = await supabase
        .from("beach_maps")
        .select("id")
        .eq("establishment_id", est.id)
        .eq("is_active", true);

      let elementsCount = 0;
      if (maps && maps.length > 0) {
        const { data: rows } = await supabase
          .from("map_rows")
          .select("id")
          .in(
            "beach_map_id",
            maps.map((m) => m.id)
          );
        if (rows && rows.length > 0) {
          const { count } = await supabase
            .from("map_elements")
            .select("*", { count: "exact", head: true })
            .in(
              "map_row_id",
              rows.map((r) => r.id)
            )
            .eq("is_active", true);
          elementsCount = count || 0;
        }
      }

      return {
        ...est,
        bookingsCount: bookingsCount || 0,
        elementsCount,
      };
    })
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Stabilimenti</h1>
          <p className="text-muted-foreground">
            Tutti gli stabilimenti registrati sulla piattaforma.
          </p>
        </div>
        <Badge variant="outline" className="text-base px-3 py-1">
          {enriched.length} totali
        </Badge>
      </div>

      {enriched.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Building2 className="mx-auto h-12 w-12 text-muted-foreground/30" />
            <p className="mt-4 text-muted-foreground">
              Nessuno stabilimento registrato.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {enriched.map((est) => (
            <Card
              key={est.id}
              className="group transition-all hover:shadow-lg hover:-translate-y-0.5"
            >
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-azure/10">
                      <Building2 className="h-5 w-5 text-brand-azure" />
                    </div>
                    <div>
                      <h3 className="font-semibold">{est.name}</h3>
                      <p className="text-xs text-muted-foreground">{est.slug}</p>
                    </div>
                  </div>
                  {est.is_active ? (
                    <Badge variant="available" className="gap-1">
                      <CheckCircle2 className="h-3 w-3" />
                      Attivo
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="gap-1">
                      <Clock className="h-3 w-3" />
                      Inattivo
                    </Badge>
                  )}
                </div>

                {(est.city || est.address) && (
                  <div className="mt-3 flex items-center gap-1.5 text-sm text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5" />
                    {est.address && `${est.address}, `}
                    {est.city}
                    {est.province && ` (${est.province})`}
                  </div>
                )}

                <div className="mt-4 flex items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Umbrella className="h-3.5 w-3.5" />
                    {est.elementsCount} posti
                  </span>
                  <span className="flex items-center gap-1">
                    <CalendarDays className="h-3.5 w-3.5" />
                    {est.bookingsCount} prenotazioni
                  </span>
                </div>

                <div className="mt-4 flex items-center gap-2">
                  <Button variant="outline" size="sm" className="flex-1" asChild>
                    <Link href={`/dashboard/${est.slug}`}>
                      Dashboard <ArrowRight className="h-3 w-3" />
                    </Link>
                  </Button>
                  <Button variant="ghost" size="sm" asChild>
                    <Link href={`/lido/${est.slug}`} target="_blank">
                      <ExternalLink className="h-3.5 w-3.5" />
                    </Link>
                  </Button>
                </div>

                <p className="mt-3 text-xs text-muted-foreground">
                  Registrato il{" "}
                  {new Date(est.created_at).toLocaleDateString("it-IT")}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

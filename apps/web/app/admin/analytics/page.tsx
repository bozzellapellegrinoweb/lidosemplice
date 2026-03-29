import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  TrendingUp,
  Building2,
  CalendarDays,
  Euro,
  Users,
  Umbrella,
  UtensilsCrossed,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";

export default async function AdminAnalytics() {
  const supabase = await createClient();

  // Prenotazioni per stato
  const statuses = ["confirmed", "checked_in", "completed", "pending", "cancelled", "no_show"];
  const statusCounts: Record<string, number> = {};
  for (const status of statuses) {
    const { count } = await supabase
      .from("bookings")
      .select("*", { count: "exact", head: true })
      .eq("status", status);
    statusCounts[status] = count || 0;
  }

  // Prenotazioni ultimi 7 giorni
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const { count: last7days } = await supabase
    .from("bookings")
    .select("*", { count: "exact", head: true })
    .gte("created_at", sevenDaysAgo.toISOString())
    .neq("status", "cancelled");

  // Prenotazioni ultimi 30 giorni
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const { count: last30days } = await supabase
    .from("bookings")
    .select("*", { count: "exact", head: true })
    .gte("created_at", thirtyDaysAgo.toISOString())
    .neq("status", "cancelled");

  // Volume transato ultimi 30gg
  const { data: recentBookings } = await supabase
    .from("bookings")
    .select("total_cents")
    .gte("created_at", thirtyDaysAgo.toISOString())
    .neq("status", "cancelled");

  const recentVolume = (recentBookings || []).reduce(
    (sum, b) => sum + (b.total_cents || 0),
    0
  );

  // Top stabilimenti per prenotazioni
  const { data: allBookings } = await supabase
    .from("bookings")
    .select("establishment_id, total_cents")
    .neq("status", "cancelled");

  const estStats: Record<string, { count: number; revenue: number }> = {};
  for (const b of allBookings || []) {
    if (!estStats[b.establishment_id]) {
      estStats[b.establishment_id] = { count: 0, revenue: 0 };
    }
    estStats[b.establishment_id].count++;
    estStats[b.establishment_id].revenue += b.total_cents || 0;
  }

  const topEstIds = Object.entries(estStats)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 5)
    .map(([id]) => id);

  let topEstablishments: { name: string; slug: string; count: number; revenue: number }[] = [];
  if (topEstIds.length > 0) {
    const { data: ests } = await supabase
      .from("establishments")
      .select("id, name, slug")
      .in("id", topEstIds);

    topEstablishments = (ests || []).map((e) => ({
      name: e.name,
      slug: e.slug,
      count: estStats[e.id]?.count || 0,
      revenue: estStats[e.id]?.revenue || 0,
    })).sort((a, b) => b.count - a.count);
  }

  // Ordini bar totali e volume
  const { data: allBarOrders } = await supabase
    .from("bar_orders")
    .select("total_cents")
    .neq("status", "cancelled");

  const barVolume = (allBarOrders || []).reduce(
    (sum, o) => sum + (o.total_cents || 0),
    0
  );

  const formatCurrency = (cents: number) =>
    (cents / 100).toLocaleString("it-IT", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  const statusLabels: Record<string, string> = {
    confirmed: "Confermati",
    checked_in: "Check-in",
    completed: "Completati",
    pending: "In attesa",
    cancelled: "Cancellati",
    no_show: "No show",
  };

  const statusColors: Record<string, string> = {
    confirmed: "bg-brand-azure",
    checked_in: "bg-available",
    completed: "bg-brand-cyan",
    pending: "bg-partial",
    cancelled: "bg-occupied",
    no_show: "bg-muted-foreground",
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Analytics piattaforma</h1>
        <p className="text-muted-foreground">
          Metriche aggregate di tutti gli stabilimenti.
        </p>
      </div>

      {/* Metriche periodo */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Ultimi 7 giorni</p>
            <p className="mt-1 text-3xl font-bold">{last7days || 0}</p>
            <p className="mt-1 text-xs text-muted-foreground">prenotazioni</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Ultimi 30 giorni</p>
            <p className="mt-1 text-3xl font-bold">{last30days || 0}</p>
            <p className="mt-1 text-xs text-muted-foreground">prenotazioni</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Volume 30gg</p>
            <p className="mt-1 text-3xl font-bold">
              {formatCurrency(recentVolume)}&euro;
            </p>
            <p className="mt-1 text-xs text-muted-foreground">transato</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Volume bar</p>
            <p className="mt-1 text-3xl font-bold">
              {formatCurrency(barVolume)}&euro;
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {allBarOrders?.length || 0} ordini
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Prenotazioni per stato */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Prenotazioni per stato</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {statuses.map((status) => {
                const total = Object.values(statusCounts).reduce((a, b) => a + b, 0);
                const pct = total > 0 ? (statusCounts[status] / total) * 100 : 0;
                return (
                  <div key={status}>
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{statusLabels[status]}</span>
                      <span className="text-muted-foreground">
                        {statusCounts[status]} ({pct.toFixed(0)}%)
                      </span>
                    </div>
                    <div className="mt-1 h-2 overflow-hidden rounded-full bg-muted">
                      <div
                        className={`h-full rounded-full ${statusColors[status]}`}
                        style={{ width: `${Math.max(pct, 1)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Top stabilimenti */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Top stabilimenti</CardTitle>
          </CardHeader>
          <CardContent>
            {topEstablishments.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Nessun dato disponibile.
              </p>
            ) : (
              <div className="space-y-4">
                {topEstablishments.map((est, i) => (
                  <div
                    key={est.slug}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-azure/10 text-sm font-bold text-brand-azure">
                        {i + 1}
                      </div>
                      <div>
                        <p className="font-medium">{est.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {est.count} prenotazioni
                        </p>
                      </div>
                    </div>
                    <span className="font-semibold">
                      {formatCurrency(est.revenue)}&euro;
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

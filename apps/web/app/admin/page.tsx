import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Building2,
  Euro,
  Users,
  TrendingUp,
  ArrowRight,
  CreditCard,
  CalendarDays,
  CheckCircle2,
  Clock,
  XCircle,
  Umbrella,
  BarChart3,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";

export default async function AdminDashboard() {
  const supabase = await createClient();

  // Totale stabilimenti
  const { count: totalEstablishments } = await supabase
    .from("establishments")
    .select("*", { count: "exact", head: true });

  // Stabilimenti attivi
  const { count: activeEstablishments } = await supabase
    .from("establishments")
    .select("*", { count: "exact", head: true })
    .eq("is_active", true);

  // Totale utenti
  const { count: totalUsers } = await supabase
    .from("user_profiles")
    .select("*", { count: "exact", head: true });

  // Totale prenotazioni
  const { count: totalBookings } = await supabase
    .from("bookings")
    .select("*", { count: "exact", head: true });

  // Prenotazioni di oggi (tutte le strutture)
  const today = new Date().toISOString().split("T")[0];
  const { data: todayBookings } = await supabase
    .from("bookings")
    .select("id, total_cents, status")
    .lte("start_date", today)
    .gte("end_date", today)
    .neq("status", "cancelled");

  const bookingsTodayCount = todayBookings?.length || 0;
  const revenueTodayCents = (todayBookings || []).reduce(
    (sum, b) => sum + (b.total_cents || 0),
    0
  );

  // Fatturato totale piattaforma (da prenotazioni)
  const { data: allBookings } = await supabase
    .from("bookings")
    .select("total_cents")
    .neq("status", "cancelled");

  const totalRevenueCents = (allBookings || []).reduce(
    (sum, b) => sum + (b.total_cents || 0),
    0
  );

  // Abbonamenti
  const { data: subscriptions } = await supabase
    .from("platform_subscriptions")
    .select("id, status, establishment_id");

  const activeSubscriptions = (subscriptions || []).filter(
    (s) => s.status === "active"
  ).length;
  const trialSubscriptions = (subscriptions || []).filter(
    (s) => s.status === "trialing"
  ).length;

  // MRR (497€/anno = 41,42€/mese per abbonamento attivo)
  const mrr = activeSubscriptions * 4142; // in cents
  const arr = activeSubscriptions * 49700; // in cents

  // Ultimi stabilimenti registrati
  const { data: recentEstablishments } = await supabase
    .from("establishments")
    .select("id, name, slug, city, province, is_active, created_at, subscription_status, subscription_expires_at")
    .order("created_at", { ascending: false })
    .limit(8);

  // Ultimi ordini bar
  const { count: totalBarOrders } = await supabase
    .from("bar_orders")
    .select("*", { count: "exact", head: true });

  // Totale elementi mappa (ombrelloni etc)
  const { count: totalElements } = await supabase
    .from("map_elements")
    .select("*", { count: "exact", head: true })
    .eq("is_active", true);

  const formatCurrency = (cents: number) =>
    (cents / 100).toLocaleString("it-IT", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Super Admin</h1>
        <p className="text-muted-foreground">
          Panoramica completa della piattaforma LidoFacile.it
        </p>
      </div>

      {/* Revenue cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-brand-cyan/20 bg-gradient-to-br from-brand-navy to-brand-navy-light text-white">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-white/60">MRR</p>
                <p className="mt-1 text-3xl font-bold">
                  {formatCurrency(mrr)}&euro;
                </p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-cyan/20">
                <TrendingUp className="h-6 w-6 text-brand-cyan" />
              </div>
            </div>
            <p className="mt-2 text-xs text-white/40">
              ARR: {formatCurrency(arr)}&euro;
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Stabilimenti</p>
                <p className="mt-1 text-3xl font-bold">
                  {totalEstablishments || 0}
                </p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-azure/10">
                <Building2 className="h-6 w-6 text-brand-azure" />
              </div>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              {activeEstablishments || 0} attivi
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Abbonamenti</p>
                <p className="mt-1 text-3xl font-bold">{activeSubscriptions}</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-available/10">
                <CreditCard className="h-6 w-6 text-available" />
              </div>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              {trialSubscriptions > 0
                ? `+ ${trialSubscriptions} in trial`
                : "Nessun trial attivo"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Utenti totali</p>
                <p className="mt-1 text-3xl font-bold">{totalUsers || 0}</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-partial/10">
                <Users className="h-6 w-6 text-partial" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Seconda riga metriche */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Prenotazioni oggi</p>
                <p className="mt-1 text-3xl font-bold">{bookingsTodayCount}</p>
              </div>
              <CalendarDays className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Incasso oggi: {formatCurrency(revenueTodayCents)}&euro;
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  Prenotazioni totali
                </p>
                <p className="mt-1 text-3xl font-bold">{totalBookings || 0}</p>
              </div>
              <CalendarDays className="h-5 w-5 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Volume transato</p>
                <p className="mt-1 text-3xl font-bold">
                  {formatCurrency(totalRevenueCents)}&euro;
                </p>
              </div>
              <Euro className="h-5 w-5 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Ombrelloni gestiti</p>
                <p className="mt-1 text-3xl font-bold">{totalElements || 0}</p>
              </div>
              <Umbrella className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              {totalBarOrders || 0} ordini bar totali
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabella stabilimenti */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Ultimi stabilimenti</CardTitle>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/admin/stabilimenti">
              Vedi tutti <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          {!recentEstablishments || recentEstablishments.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Nessuno stabilimento registrato.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-3 font-medium">Stabilimento</th>
                    <th className="pb-3 font-medium">Citta</th>
                    <th className="pb-3 font-medium">Abbonamento</th>
                    <th className="pb-3 font-medium">Registrato</th>
                    <th className="pb-3 text-right font-medium">Azioni</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {recentEstablishments.map((est) => {
                    const subStatus = est.subscription_status as string | null;
                    const expiresAt = est.subscription_expires_at
                      ? new Date(est.subscription_expires_at)
                      : null;
                    const daysLeft = expiresAt
                      ? Math.ceil((expiresAt.getTime() - Date.now()) / 86400000)
                      : null;

                    return (
                    <tr key={est.id} className="group">
                      <td className="py-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-azure/10">
                            <Building2 className="h-4 w-4 text-brand-azure" />
                          </div>
                          <div>
                            <p className="font-medium">{est.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {est.slug}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 text-muted-foreground">
                        {est.city || "—"}
                        {est.province ? ` (${est.province})` : ""}
                      </td>
                      <td className="py-3">
                        {subStatus === "active" ? (
                          <Badge variant="available" className="gap-1">
                            <CheckCircle2 className="h-3 w-3" />
                            Attivo
                          </Badge>
                        ) : subStatus === "trial" ? (
                          <Badge variant="partial" className="gap-1">
                            <Clock className="h-3 w-3" />
                            Trial
                            {daysLeft !== null && daysLeft > 0 && (
                              <span className="ml-1 font-bold">{daysLeft}g</span>
                            )}
                          </Badge>
                        ) : subStatus === "expired" ? (
                          <Badge variant="occupied" className="gap-1">
                            <XCircle className="h-3 w-3" />
                            Scaduto
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="gap-1">
                            <Clock className="h-3 w-3" />
                            {subStatus || "Nessuno"}
                          </Badge>
                        )}
                      </td>
                      <td className="py-3 text-muted-foreground">
                        {new Date(est.created_at).toLocaleDateString("it-IT")}
                      </td>
                      <td className="py-3 text-right">
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/dashboard/${est.slug}`}>
                            Entra <ArrowRight className="h-3 w-3" />
                          </Link>
                        </Button>
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Azioni rapide */}
      <div className="grid gap-3 sm:grid-cols-3">
        <Button
          variant="outline"
          size="lg"
          className="justify-start gap-3"
          asChild
        >
          <Link href="/admin/stabilimenti">
            <Building2 className="h-5 w-5 text-brand-azure" />
            Gestisci stabilimenti
          </Link>
        </Button>
        <Button
          variant="outline"
          size="lg"
          className="justify-start gap-3"
          asChild
        >
          <Link href="/admin/abbonamenti">
            <CreditCard className="h-5 w-5 text-brand-azure" />
            Gestisci abbonamenti
          </Link>
        </Button>
        <Button
          variant="outline"
          size="lg"
          className="justify-start gap-3"
          asChild
        >
          <Link href="/admin/analytics">
            <BarChart3 className="h-5 w-5 text-brand-azure" />
            Analytics piattaforma
          </Link>
        </Button>
      </div>
    </div>
  );
}

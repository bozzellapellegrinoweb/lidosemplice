import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Umbrella,
  Euro,
  Users,
  CalendarDays,
  TrendingUp,
  ArrowRight,
  UtensilsCrossed,
  Clock,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";

const statusLabels: Record<string, { label: string; variant: "available" | "partial" | "occupied" | "outline" }> = {
  checked_in: { label: "Check-in", variant: "available" },
  confirmed: { label: "Confermato", variant: "partial" },
  pending: { label: "In attesa", variant: "outline" },
  completed: { label: "Completato", variant: "outline" },
  cancelled: { label: "Cancellato", variant: "occupied" },
  no_show: { label: "No show", variant: "occupied" },
};

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function DashboardHome({ params }: PageProps) {
  const { slug } = await params;
  const supabase = await createClient();

  // Get establishment
  const { data: est } = await supabase
    .from("establishments")
    .select("id, name")
    .eq("slug", slug)
    .single();

  if (!est) {
    return <p className="p-8 text-center text-muted-foreground">Stabilimento non trovato.</p>;
  }

  const today = new Date().toISOString().split("T")[0];

  // Today's bookings
  const { data: todayBookings } = await supabase
    .from("bookings")
    .select("id, booking_code, guest_name, status, total_cents, start_date, end_date, created_at")
    .eq("establishment_id", est.id)
    .lte("start_date", today)
    .gte("end_date", today)
    .neq("status", "cancelled");

  const bookingsToday = todayBookings || [];
  const revenueTodayCents = bookingsToday.reduce((sum, b) => sum + (b.total_cents || 0), 0);
  const checkedIn = bookingsToday.filter((b) => b.status === "checked_in").length;

  // Total elements for occupancy
  const { data: maps } = await supabase
    .from("beach_maps")
    .select("id")
    .eq("establishment_id", est.id)
    .eq("is_active", true);

  let totalElements = 0;
  if (maps && maps.length > 0) {
    const { data: rows } = await supabase
      .from("map_rows")
      .select("id")
      .eq("beach_map_id", maps[0].id);

    if (rows && rows.length > 0) {
      const { count } = await supabase
        .from("map_elements")
        .select("*", { count: "exact", head: true })
        .in("map_row_id", rows.map((r) => r.id))
        .eq("is_active", true);
      totalElements = count || 0;
    }
  }

  const occupancy = totalElements > 0
    ? Math.round((bookingsToday.length / totalElements) * 100)
    : 0;

  // Today's bar orders
  const { data: barOrders } = await supabase
    .from("bar_orders")
    .select("id, umbrella_label, guest_name, status, total_cents, created_at, bar_order_items(quantity, price_cents, menu_items(name))")
    .eq("establishment_id", est.id)
    .gte("created_at", `${today}T00:00:00`)
    .neq("status", "cancelled");

  const barOrdersToday = barOrders || [];
  const pendingBarOrders = barOrdersToday.filter((o) => o.status === "pending" || o.status === "preparing");

  // Recent bookings (last 5)
  const { data: recentBookings } = await supabase
    .from("bookings")
    .select("id, booking_code, guest_name, status, total_cents, start_date, end_date")
    .eq("establishment_id", est.id)
    .order("created_at", { ascending: false })
    .limit(5);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">
          Panoramica di oggi per {est.name}.
        </p>
      </div>

      {/* Stats cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Prenotazioni oggi</p>
                <p className="mt-1 text-3xl font-bold">{bookingsToday.length}</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-azure/10">
                <CalendarDays className="h-6 w-6 text-brand-azure" />
              </div>
            </div>
            <div className="mt-3 flex items-center gap-1 text-sm">
              <Users className="h-4 w-4 text-available" />
              <span className="text-muted-foreground">{checkedIn} check-in effettuati</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Incasso oggi</p>
                <p className="mt-1 text-3xl font-bold">
                  {(revenueTodayCents / 100).toLocaleString("it-IT", { minimumFractionDigits: 2 })}&euro;
                </p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-available/10">
                <Euro className="h-6 w-6 text-available" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Occupazione</p>
                <p className="mt-1 text-3xl font-bold">{occupancy}%</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-partial/10">
                <Umbrella className="h-6 w-6 text-partial" />
              </div>
            </div>
            <div className="mt-3 text-sm text-muted-foreground">
              {bookingsToday.length}/{totalElements} posti occupati
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Ordini bar</p>
                <p className="mt-1 text-3xl font-bold">{barOrdersToday.length}</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-cyan/10">
                <UtensilsCrossed className="h-6 w-6 text-brand-cyan" />
              </div>
            </div>
            {pendingBarOrders.length > 0 && (
              <div className="mt-3 text-sm text-partial font-medium">
                {pendingBarOrders.length} in attesa
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        {/* Prenotazioni recenti */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Prenotazioni recenti</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link href={`/dashboard/${slug}/prenotazioni`}>
                Vedi tutte <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {(!recentBookings || recentBookings.length === 0) ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Nessuna prenotazione ancora. Le prenotazioni appariranno qui.
              </p>
            ) : (
              <div className="space-y-3">
                {recentBookings.map((booking) => (
                  <div
                    key={booking.id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted font-mono text-xs font-medium">
                        {booking.booking_code?.slice(-4) || "?"}
                      </div>
                      <div>
                        <p className="font-medium">{booking.guest_name}</p>
                        <p className="text-sm text-muted-foreground">
                          {booking.booking_code} &middot;{" "}
                          {booking.start_date === booking.end_date
                            ? booking.start_date
                            : `${booking.start_date} → ${booking.end_date}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant={statusLabels[booking.status]?.variant || "outline"}>
                        {statusLabels[booking.status]?.label || booking.status}
                      </Badge>
                      <span className="font-semibold">
                        {(booking.total_cents / 100).toFixed(2)}&euro;
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Ordini bar in attesa */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Ordini bar in attesa</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link href={`/dashboard/${slug}/ordini-bar`}>
                Vedi tutti <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {pendingBarOrders.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Nessun ordine in attesa
              </p>
            ) : (
              <div className="space-y-3">
                {pendingBarOrders.map((order) => {
                  const items = (order.bar_order_items as unknown as { quantity: number; price_cents: number; menu_items: { name: string } | null }[]) || [];
                  const itemsText = items.map((i) => `${i.quantity}x ${i.menu_items?.name || "Articolo"}`).join(", ");
                  const mins = Math.floor((Date.now() - new Date(order.created_at).getTime()) / 60000);
                  const timeAgo = mins < 1 ? "Ora" : mins < 60 ? `${mins} min fa` : `${Math.floor(mins / 60)}h fa`;

                  return (
                    <div
                      key={order.id}
                      className="rounded-lg border border-partial/30 bg-partial/5 p-3"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Umbrella className="h-4 w-4 text-partial" />
                          <span className="font-medium">Omb. {order.umbrella_label || "?"}</span>
                        </div>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {timeAgo}
                        </div>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {itemsText || "Nessun articolo"}
                      </p>
                      <div className="mt-2 flex items-center justify-between">
                        <span className="font-semibold">
                          {(order.total_cents / 100).toFixed(2)}&euro;
                        </span>
                        <Badge variant={order.status === "pending" ? "partial" : "available"}>
                          {order.status === "pending" ? "Nuovo" : "In preparazione"}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick actions */}
      <div className="grid gap-3 sm:grid-cols-3">
        <Button variant="outline" size="lg" className="justify-start gap-3" asChild>
          <Link href={`/dashboard/${slug}/mappa`}>
            <Umbrella className="h-5 w-5 text-brand-azure" />
            Apri mappa stabilimento
          </Link>
        </Button>
        <Button variant="outline" size="lg" className="justify-start gap-3" asChild>
          <Link href={`/dashboard/${slug}/prenotazioni`}>
            <CalendarDays className="h-5 w-5 text-brand-azure" />
            Nuova prenotazione
          </Link>
        </Button>
        <Button variant="outline" size="lg" className="justify-start gap-3" asChild>
          <Link href={`/dashboard/${slug}/analytics`}>
            <TrendingUp className="h-5 w-5 text-brand-azure" />
            Statistiche complete
          </Link>
        </Button>
      </div>
    </div>
  );
}

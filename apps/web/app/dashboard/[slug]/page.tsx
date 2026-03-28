import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Umbrella,
  Euro,
  Users,
  CalendarDays,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  UtensilsCrossed,
  Clock,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

// Mock data — in produzione dal database
const STATS = {
  today: {
    bookings: 34,
    revenue: 1850,
    occupancy: 72,
    barOrders: 18,
    checkIns: 28,
    noShows: 2,
  },
  trends: {
    bookings: +12,
    revenue: +8,
    occupancy: -3,
    barOrders: +22,
  },
};

const RECENT_BOOKINGS = [
  {
    id: "1",
    code: "BK-A3X9P",
    name: "Mario Rossi",
    umbrella: "A3",
    date: "Oggi",
    status: "checked_in" as const,
    total: 90,
  },
  {
    id: "2",
    code: "BK-H7K2M",
    name: "Giulia Bianchi",
    umbrella: "B7",
    date: "Oggi",
    status: "confirmed" as const,
    total: 70,
  },
  {
    id: "3",
    code: "BK-R9W4N",
    name: "Luca Verdi",
    umbrella: "C2, C3",
    date: "Domani",
    status: "pending" as const,
    total: 140,
  },
  {
    id: "4",
    code: "BK-T5Y8L",
    name: "Anna Colombo",
    umbrella: "A10",
    date: "Domani",
    status: "confirmed" as const,
    total: 45,
  },
];

const PENDING_BAR_ORDERS = [
  {
    id: "1",
    umbrella: "A3",
    items: "2x Spritz, 1x Insalata",
    total: 28,
    time: "5 min fa",
  },
  {
    id: "2",
    umbrella: "B7",
    items: "3x Acqua, 1x Gelato",
    total: 14,
    time: "12 min fa",
  },
];

const statusLabels: Record<string, { label: string; variant: "available" | "partial" | "occupied" | "outline" }> = {
  checked_in: { label: "In spiaggia", variant: "available" },
  confirmed: { label: "Confermato", variant: "partial" },
  pending: { label: "In attesa", variant: "outline" },
  cancelled: { label: "Cancellato", variant: "occupied" },
};

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function DashboardHome({ params }: PageProps) {
  const { slug } = await params;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">
          Panoramica di oggi per il tuo stabilimento.
        </p>
      </div>

      {/* Stats cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Prenotazioni oggi</p>
                <p className="mt-1 text-3xl font-bold">{STATS.today.bookings}</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-azure/10">
                <CalendarDays className="h-6 w-6 text-brand-azure" />
              </div>
            </div>
            <div className="mt-3 flex items-center gap-1 text-sm">
              <TrendingUp className="h-4 w-4 text-available" />
              <span className="text-available">+{STATS.trends.bookings}%</span>
              <span className="text-muted-foreground">vs ieri</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Incasso oggi</p>
                <p className="mt-1 text-3xl font-bold">{STATS.today.revenue}&euro;</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-available/10">
                <Euro className="h-6 w-6 text-available" />
              </div>
            </div>
            <div className="mt-3 flex items-center gap-1 text-sm">
              <TrendingUp className="h-4 w-4 text-available" />
              <span className="text-available">+{STATS.trends.revenue}%</span>
              <span className="text-muted-foreground">vs ieri</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Occupazione</p>
                <p className="mt-1 text-3xl font-bold">{STATS.today.occupancy}%</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-partial/10">
                <Umbrella className="h-6 w-6 text-partial" />
              </div>
            </div>
            <div className="mt-3 flex items-center gap-1 text-sm">
              <TrendingDown className="h-4 w-4 text-occupied" />
              <span className="text-occupied">{STATS.trends.occupancy}%</span>
              <span className="text-muted-foreground">vs ieri</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Ordini bar</p>
                <p className="mt-1 text-3xl font-bold">{STATS.today.barOrders}</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-cyan/10">
                <UtensilsCrossed className="h-6 w-6 text-brand-cyan" />
              </div>
            </div>
            <div className="mt-3 flex items-center gap-1 text-sm">
              <TrendingUp className="h-4 w-4 text-available" />
              <span className="text-available">+{STATS.trends.barOrders}%</span>
              <span className="text-muted-foreground">vs ieri</span>
            </div>
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
            <div className="space-y-3">
              {RECENT_BOOKINGS.map((booking) => (
                <div
                  key={booking.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                      <Users className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-medium">{booking.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {booking.code} &middot; Omb. {booking.umbrella} &middot; {booking.date}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant={statusLabels[booking.status].variant}>
                      {statusLabels[booking.status].label}
                    </Badge>
                    <span className="font-semibold">{booking.total}&euro;</span>
                  </div>
                </div>
              ))}
            </div>
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
            {PENDING_BAR_ORDERS.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Nessun ordine in attesa
              </p>
            ) : (
              <div className="space-y-3">
                {PENDING_BAR_ORDERS.map((order) => (
                  <div
                    key={order.id}
                    className="rounded-lg border border-partial/30 bg-partial/5 p-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Umbrella className="h-4 w-4 text-partial" />
                        <span className="font-medium">Omb. {order.umbrella}</span>
                      </div>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {order.time}
                      </div>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {order.items}
                    </p>
                    <div className="mt-2 flex items-center justify-between">
                      <span className="font-semibold">{order.total}&euro;</span>
                      <Button variant="brand" size="sm">
                        Pronto
                      </Button>
                    </div>
                  </div>
                ))}
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
            Apri mappa spiaggia
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

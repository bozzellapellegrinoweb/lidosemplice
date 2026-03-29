"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  BarChart3,
  TrendingUp,
  Euro,
  Umbrella,
  Users,
  CalendarDays,
  Download,
  Loader2,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { format, subDays } from "date-fns";
import { it } from "date-fns/locale";
import {
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface Stats {
  totalBookings: number;
  totalRevenueCents: number;
  totalClients: number;
  barOrdersCents: number;
}

interface DailyData {
  date: string;
  bookings: number;
  revenue: number;
}

export default function AnalyticsPage() {
  const params = useParams();
  const slug = params.slug as string;

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Stats>({
    totalBookings: 0,
    totalRevenueCents: 0,
    totalClients: 0,
    barOrdersCents: 0,
  });
  const [totalElements, setTotalElements] = useState(0);
  const [dailyData, setDailyData] = useState<DailyData[]>([]);

  useEffect(() => {
    loadStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  async function loadStats() {
    const supabase = createClient();
    const { data: est } = await supabase
      .from("establishments")
      .select("id")
      .eq("slug", slug)
      .single();

    if (!est) return;

    // Bookings stats
    const { data: bookings } = await supabase
      .from("bookings")
      .select("id, total_cents, guest_email, status")
      .eq("establishment_id", est.id)
      .neq("status", "cancelled");

    const totalBookings = bookings?.length || 0;
    const totalRevenueCents = bookings?.reduce((sum, b) => sum + (b.total_cents || 0), 0) || 0;
    const uniqueEmails = new Set(bookings?.map((b) => b.guest_email).filter(Boolean));
    const totalClients = uniqueEmails.size;

    // Bar orders
    const { data: barOrders } = await supabase
      .from("bar_orders")
      .select("total_cents")
      .eq("establishment_id", est.id)
      .neq("status", "cancelled");

    const barOrdersCents = barOrders?.reduce((sum, o) => sum + (o.total_cents || 0), 0) || 0;

    // Total elements
    const { data: maps } = await supabase
      .from("beach_maps")
      .select("id")
      .eq("establishment_id", est.id)
      .eq("is_active", true);

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

        setTotalElements(count || 0);
      }
    }

    // Daily data for last 7 days
    const today = new Date();
    const sevenDaysAgo = subDays(today, 6);
    const startDate = format(sevenDaysAgo, "yyyy-MM-dd");

    const { data: recentBookings } = await supabase
      .from("bookings")
      .select("start_date, total_cents")
      .eq("establishment_id", est.id)
      .neq("status", "cancelled")
      .gte("start_date", startDate);

    // Build a map for all 7 days
    const dayMap: Record<string, { bookings: number; revenue: number }> = {};
    for (let i = 0; i < 7; i++) {
      const d = format(subDays(today, 6 - i), "yyyy-MM-dd");
      dayMap[d] = { bookings: 0, revenue: 0 };
    }

    if (recentBookings) {
      for (const b of recentBookings) {
        const d = b.start_date;
        if (dayMap[d]) {
          dayMap[d].bookings += 1;
          dayMap[d].revenue += (b.total_cents || 0) / 100;
        }
      }
    }

    const daily: DailyData[] = Object.entries(dayMap).map(([dateStr, val]) => ({
      date: format(new Date(dateStr + "T00:00:00"), "dd/MM", { locale: it }),
      bookings: val.bookings,
      revenue: Math.round(val.revenue * 100) / 100,
    }));

    setDailyData(daily);
    setStats({ totalBookings, totalRevenueCents, totalClients, barOrdersCents });
    setLoading(false);
  }

  const avgDaily = stats.totalBookings > 0
    ? Math.round(stats.totalRevenueCents / Math.max(1, stats.totalBookings) / 100)
    : 0;

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-brand-azure" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Statistiche</h1>
          <p className="text-muted-foreground">
            Panoramica delle performance del tuo stabilimento.
          </p>
        </div>
        <Button variant="outline" size="sm">
          <Download className="h-4 w-4" />
          Esporta
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-available/10">
                <Euro className="h-5 w-5 text-available" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Incasso totale</p>
                <p className="text-2xl font-bold">
                  {(stats.totalRevenueCents / 100).toLocaleString("it-IT", { minimumFractionDigits: 2 })}&euro;
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-azure/10">
                <CalendarDays className="h-5 w-5 text-brand-azure" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Prenotazioni</p>
                <p className="text-2xl font-bold">{stats.totalBookings}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-partial/10">
                <Umbrella className="h-5 w-5 text-partial" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Posti totali</p>
                <p className="text-2xl font-bold">{totalElements}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-cyan/10">
                <Users className="h-5 w-5 text-brand-cyan" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Clienti unici</p>
                <p className="text-2xl font-bold">{stats.totalClients}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-available/10">
                <TrendingUp className="h-5 w-5 text-available" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Importo medio</p>
                <p className="text-2xl font-bold">{avgDaily}&euro;</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-partial/10">
                <BarChart3 className="h-5 w-5 text-partial" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Incasso bar</p>
                <p className="text-2xl font-bold">
                  {(stats.barOrdersCents / 100).toLocaleString("it-IT", { minimumFractionDigits: 2 })}&euro;
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Bookings last 7 days - BarChart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Prenotazioni ultimi 7 giorni</CardTitle>
          </CardHeader>
          <CardContent>
            {dailyData.every((d) => d.bookings === 0) ? (
              <div className="flex min-h-[250px] items-center justify-center">
                <p className="text-muted-foreground">
                  Nessuna prenotazione negli ultimi 7 giorni.
                </p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={dailyData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 12 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fontSize: 12 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    formatter={(value: number) => [value, "Prenotazioni"]}
                    labelFormatter={(label) => `Data: ${label}`}
                  />
                  <Bar
                    dataKey="bookings"
                    fill="#00BFFF"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={40}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Revenue last 7 days - AreaChart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Incasso ultimi 7 giorni</CardTitle>
          </CardHeader>
          <CardContent>
            {dailyData.every((d) => d.revenue === 0) ? (
              <div className="flex min-h-[250px] items-center justify-center">
                <p className="text-muted-foreground">
                  Nessun incasso negli ultimi 7 giorni.
                </p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={dailyData}>
                  <defs>
                    <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#00BFFF" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#00BFFF" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 12 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 12 }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => `${v}\u20AC`}
                  />
                  <Tooltip
                    formatter={(value: number) => [
                      `${value.toLocaleString("it-IT", { minimumFractionDigits: 2 })}\u20AC`,
                      "Incasso",
                    ]}
                    labelFormatter={(label) => `Data: ${label}`}
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="#00BFFF"
                    strokeWidth={2}
                    fill="url(#revenueGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

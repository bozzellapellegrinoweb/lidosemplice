"use client";

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
} from "lucide-react";

// Mock stats
const WEEKLY_DATA = [
  { day: "Lun", bookings: 22, revenue: 1100, occupancy: 45 },
  { day: "Mar", bookings: 28, revenue: 1400, occupancy: 55 },
  { day: "Mer", bookings: 35, revenue: 1750, occupancy: 68 },
  { day: "Gio", bookings: 32, revenue: 1600, occupancy: 63 },
  { day: "Ven", bookings: 42, revenue: 2100, occupancy: 82 },
  { day: "Sab", bookings: 48, revenue: 2400, occupancy: 95 },
  { day: "Dom", bookings: 45, revenue: 2250, occupancy: 90 },
];

const SUMMARY = {
  totalBookings: 252,
  totalRevenue: 12600,
  avgOccupancy: 71,
  totalClients: 198,
  avgDailyRevenue: 1800,
  barRevenue: 3200,
};

export default function AnalyticsPage() {
  const maxRevenue = Math.max(...WEEKLY_DATA.map((d) => d.revenue));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Statistiche</h1>
          <p className="text-muted-foreground">
            Panoramica delle performance del tuo stabilimento.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            Questa settimana
          </Button>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4" />
            Esporta
          </Button>
        </div>
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
                <p className="text-2xl font-bold">{SUMMARY.totalRevenue.toLocaleString("it-IT")}&euro;</p>
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
                <p className="text-2xl font-bold">{SUMMARY.totalBookings}</p>
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
                <p className="text-sm text-muted-foreground">Occupazione media</p>
                <p className="text-2xl font-bold">{SUMMARY.avgOccupancy}%</p>
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
                <p className="text-2xl font-bold">{SUMMARY.totalClients}</p>
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
                <p className="text-sm text-muted-foreground">Media giornaliera</p>
                <p className="text-2xl font-bold">{SUMMARY.avgDailyRevenue}&euro;</p>
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
                <p className="text-2xl font-bold">{SUMMARY.barRevenue.toLocaleString("it-IT")}&euro;</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Grafico incassi settimanali (CSS bars) */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Incassi settimanali</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-3" style={{ height: 200 }}>
            {WEEKLY_DATA.map((d) => (
              <div key={d.day} className="flex flex-1 flex-col items-center gap-1">
                <span className="text-xs font-semibold">{d.revenue}&euro;</span>
                <div
                  className="w-full rounded-t-md bg-brand-gradient transition-all"
                  style={{
                    height: `${(d.revenue / maxRevenue) * 160}px`,
                  }}
                />
                <span className="text-xs text-muted-foreground">{d.day}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Grafico occupazione */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Occupazione settimanale</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {WEEKLY_DATA.map((d) => (
              <div key={d.day} className="flex items-center gap-3">
                <span className="w-8 text-sm font-medium">{d.day}</span>
                <div className="flex-1">
                  <div className="h-6 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-brand-gradient transition-all"
                      style={{ width: `${d.occupancy}%` }}
                    />
                  </div>
                </div>
                <span className="w-12 text-right text-sm font-semibold">
                  {d.occupancy}%
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

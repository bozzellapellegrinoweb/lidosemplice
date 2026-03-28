"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Calendar, Euro, Sun, Snowflake, CloudSun, Flame } from "lucide-react";

interface Season {
  id: string;
  name: string;
  type: "low" | "mid" | "high" | "peak";
  startDate: string;
  endDate: string;
}

interface PriceRow {
  rowLabel: string;
  rowNumber: number;
  prices: Record<string, Record<string, number>>; // seasonId -> duration -> price
}

const SEASONS: Season[] = [
  { id: "1", name: "Bassa stagione", type: "low", startDate: "2026-05-01", endDate: "2026-06-14" },
  { id: "2", name: "Media stagione", type: "mid", startDate: "2026-06-15", endDate: "2026-07-05" },
  { id: "3", name: "Alta stagione", type: "high", startDate: "2026-07-06", endDate: "2026-08-25" },
  { id: "4", name: "Picco", type: "peak", startDate: "2026-08-01", endDate: "2026-08-20" },
];

const DURATIONS = [
  { key: "full_day", label: "Giornaliero" },
  { key: "weekly", label: "Settimanale" },
  { key: "monthly", label: "Mensile" },
  { key: "seasonal", label: "Stagionale" },
];

const MOCK_PRICES: PriceRow[] = [
  {
    rowLabel: "Prima fila", rowNumber: 1,
    prices: {
      "1": { full_day: 30, weekly: 180, monthly: 600, seasonal: 2200 },
      "2": { full_day: 40, weekly: 240, monthly: 800, seasonal: 2800 },
      "3": { full_day: 50, weekly: 300, monthly: 1000, seasonal: 3500 },
      "4": { full_day: 60, weekly: 360, monthly: 1200, seasonal: 4000 },
    },
  },
  {
    rowLabel: "Seconda fila", rowNumber: 2,
    prices: {
      "1": { full_day: 25, weekly: 150, monthly: 500, seasonal: 1800 },
      "2": { full_day: 32, weekly: 190, monthly: 650, seasonal: 2300 },
      "3": { full_day: 40, weekly: 240, monthly: 800, seasonal: 2800 },
      "4": { full_day: 48, weekly: 288, monthly: 960, seasonal: 3300 },
    },
  },
  {
    rowLabel: "Terza fila", rowNumber: 3,
    prices: {
      "1": { full_day: 20, weekly: 120, monthly: 400, seasonal: 1500 },
      "2": { full_day: 25, weekly: 150, monthly: 500, seasonal: 1800 },
      "3": { full_day: 30, weekly: 180, monthly: 600, seasonal: 2200 },
      "4": { full_day: 36, weekly: 216, monthly: 720, seasonal: 2600 },
    },
  },
  {
    rowLabel: "Quarta fila", rowNumber: 4,
    prices: {
      "1": { full_day: 15, weekly: 90, monthly: 300, seasonal: 1100 },
      "2": { full_day: 20, weekly: 120, monthly: 400, seasonal: 1500 },
      "3": { full_day: 25, weekly: 150, monthly: 500, seasonal: 1800 },
      "4": { full_day: 30, weekly: 180, monthly: 600, seasonal: 2200 },
    },
  },
];

const SEASON_ICONS = {
  low: Snowflake,
  mid: CloudSun,
  high: Sun,
  peak: Flame,
};

const SEASON_COLORS = {
  low: "text-blue-400 bg-blue-400/10",
  mid: "text-amber-400 bg-amber-400/10",
  high: "text-orange-500 bg-orange-500/10",
  peak: "text-red-500 bg-red-500/10",
};

export default function PrezziPage() {
  const [selectedSeason, setSelectedSeason] = useState(SEASONS[2].id);
  const [selectedDuration, setSelectedDuration] = useState("full_day");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Prezzi e stagioni</h1>
          <p className="text-muted-foreground">
            Configura le tariffe per fila, stagione e durata.
          </p>
        </div>
        <Button variant="brand">
          <Plus className="h-4 w-4" />
          Nuova stagione
        </Button>
      </div>

      {/* Stagioni */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {SEASONS.map((season) => {
          const Icon = SEASON_ICONS[season.type];
          return (
            <Card
              key={season.id}
              className={`cursor-pointer transition-all ${
                selectedSeason === season.id
                  ? "ring-2 ring-brand-azure"
                  : "hover:shadow-md"
              }`}
              onClick={() => setSelectedSeason(season.id)}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${SEASON_COLORS[season.type]}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-medium">{season.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {season.startDate} → {season.endDate}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Selettore durata */}
      <div className="flex gap-2">
        {DURATIONS.map((d) => (
          <Button
            key={d.key}
            variant={selectedDuration === d.key ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedDuration(d.key)}
          >
            {d.label}
          </Button>
        ))}
      </div>

      {/* Tabella prezzi */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Euro className="h-5 w-5" />
            Prezzi per fila — {SEASONS.find(s => s.id === selectedSeason)?.name} — {DURATIONS.find(d => d.key === selectedDuration)?.label}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {MOCK_PRICES.map((row) => {
              const price = row.prices[selectedSeason]?.[selectedDuration] || 0;
              return (
                <div
                  key={row.rowNumber}
                  className="flex items-center justify-between rounded-lg border p-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted font-mono font-bold">
                      F{row.rowNumber}
                    </div>
                    <div>
                      <p className="font-medium">{row.rowLabel}</p>
                      <p className="text-sm text-muted-foreground">
                        Ombrellone + 2 lettini inclusi
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1">
                      <Input
                        type="number"
                        value={price}
                        className="w-24 text-right text-lg font-bold"
                        readOnly
                      />
                      <span className="text-muted-foreground">&euro;</span>
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-4 flex justify-end">
            <Button variant="brand">Salva modifiche</Button>
          </div>
        </CardContent>
      </Card>

      {/* Info supplementare */}
      <Card>
        <CardContent className="p-4">
          <p className="text-sm text-muted-foreground">
            <strong>Suggerimento:</strong> Il prezzo lettino extra verra aggiunto automaticamente al prezzo base dell'ombrellone.
            Puoi configurare il prezzo del lettino extra nelle impostazioni.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

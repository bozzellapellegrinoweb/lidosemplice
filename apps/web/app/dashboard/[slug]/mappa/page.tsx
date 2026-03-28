"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Umbrella,
  Plus,
  Minus,
  RotateCcw,
  Save,
  Eye,
  Pencil,
  ZoomIn,
  ZoomOut,
  Grid3X3,
  Users,
  Clock,
  QrCode,
} from "lucide-react";

// Mock mappa — in produzione dal DB
const ROWS = [
  {
    number: 1, label: "Prima fila",
    elements: Array.from({ length: 10 }, (_, i) => ({
      id: `A${i + 1}`, label: `A${i + 1}`,
      status: ["occupied", "occupied", "available", "occupied", "available", "available", "checked_in", "occupied", "available", "checked_in"][i] as string,
      clientName: ["Mario Rossi", "Giulia B.", "", "Luca V.", "", "", "Anna C.", "Paolo F.", "", "Sara E."][i],
    })),
  },
  {
    number: 2, label: "Seconda fila",
    elements: Array.from({ length: 12 }, (_, i) => ({
      id: `B${i + 1}`, label: `B${i + 1}`,
      status: ["checked_in", "available", "available", "occupied", "available", "available", "occupied", "available", "checked_in", "available", "available", "occupied"][i] as string,
      clientName: ["Marco R.", "", "", "Elena M.", "", "", "Fabio N.", "", "Chiara G.", "", "", "Simone L."][i],
    })),
  },
  {
    number: 3, label: "Terza fila",
    elements: Array.from({ length: 12 }, (_, i) => ({
      id: `C${i + 1}`, label: `C${i + 1}`,
      status: ["available", "available", "checked_in", "available", "available", "occupied", "available", "available", "available", "available", "checked_in", "available"][i] as string,
      clientName: ["", "", "Davide P.", "", "", "Laura B.", "", "", "", "", "Marta T.", ""][i],
    })),
  },
  {
    number: 4, label: "Quarta fila",
    elements: Array.from({ length: 14 }, (_, i) => ({
      id: `D${i + 1}`, label: `D${i + 1}`,
      status: i % 5 === 0 ? "occupied" : i % 7 === 0 ? "checked_in" : "available",
      clientName: i % 5 === 0 ? "Cliente" : i % 7 === 0 ? "Cliente" : "",
    })),
  },
];

const STATUS_COLORS: Record<string, string> = {
  available: "bg-available/15 border-available/40 text-available hover:bg-available/25",
  occupied: "bg-partial/15 border-partial/40 text-partial",
  checked_in: "bg-brand-azure/15 border-brand-azure/40 text-brand-azure",
};

const STATUS_LABELS: Record<string, string> = {
  available: "Libero",
  occupied: "Prenotato",
  checked_in: "In spiaggia",
};

export default function MappaPage() {
  const [mode, setMode] = useState<"view" | "edit">("view");
  const [selectedElement, setSelectedElement] = useState<string | null>(null);
  const [zoom, setZoom] = useState(100);

  const totalElements = ROWS.reduce((sum, r) => sum + r.elements.length, 0);
  const occupiedCount = ROWS.reduce(
    (sum, r) => sum + r.elements.filter((e) => e.status !== "available").length,
    0
  );
  const occupancy = Math.round((occupiedCount / totalElements) * 100);

  const selected = selectedElement
    ? ROWS.flatMap((r) => r.elements).find((e) => e.id === selectedElement)
    : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Mappa spiaggia</h1>
          <p className="text-muted-foreground">
            Vista in tempo reale — {occupiedCount}/{totalElements} occupati ({occupancy}%)
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={mode === "view" ? "default" : "outline"}
            size="sm"
            onClick={() => setMode("view")}
          >
            <Eye className="h-4 w-4" />
            Vista
          </Button>
          <Button
            variant={mode === "edit" ? "default" : "outline"}
            size="sm"
            onClick={() => setMode("edit")}
          >
            <Pencil className="h-4 w-4" />
            Modifica
          </Button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between rounded-lg border bg-card p-2">
        <div className="flex items-center gap-2">
          {mode === "edit" && (
            <>
              <Button variant="outline" size="sm">
                <Plus className="h-4 w-4" />
                Aggiungi fila
              </Button>
              <Button variant="outline" size="sm">
                <Umbrella className="h-4 w-4" />
                Aggiungi ombrellone
              </Button>
              <Button variant="outline" size="sm">
                <RotateCcw className="h-4 w-4" />
                Annulla
              </Button>
              <Button variant="brand" size="sm">
                <Save className="h-4 w-4" />
                Salva mappa
              </Button>
            </>
          )}
          {mode === "view" && (
            <div className="flex gap-4 px-2 text-sm">
              <span className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-full bg-available/50" />
                Libero
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-full bg-partial/50" />
                Prenotato
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-full bg-brand-azure" />
                In spiaggia
              </span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setZoom(Math.max(50, zoom - 10))}
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="w-12 text-center text-xs">{zoom}%</span>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setZoom(Math.min(150, zoom + 10))}
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        {/* Mappa */}
        <Card>
          <CardContent className="p-4 sm:p-6">
            <div
              style={{ transform: `scale(${zoom / 100})`, transformOrigin: "top left" }}
              className="transition-transform"
            >
              {/* Mare */}
              <div className="mb-4 flex h-14 items-center justify-center rounded-lg bg-gradient-to-r from-brand-cyan/15 via-brand-azure/15 to-brand-blue/15">
                <span className="text-sm font-medium text-brand-azure">
                  MARE
                </span>
              </div>

              {/* File */}
              <div className="space-y-4">
                {ROWS.map((row) => (
                  <div key={row.number}>
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-sm font-medium text-muted-foreground">
                        {row.label}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {row.elements.filter((e) => e.status === "available").length} liberi
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {row.elements.map((el) => (
                        <button
                          key={el.id}
                          onClick={() => setSelectedElement(el.id)}
                          className={`flex h-14 w-14 flex-col items-center justify-center rounded-lg border-2 text-xs font-medium transition-all ${
                            STATUS_COLORS[el.status]
                          } ${selectedElement === el.id ? "ring-2 ring-foreground/20 scale-110" : ""}`}
                        >
                          <Umbrella className="h-4 w-4" />
                          <span className="mt-0.5">{el.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pannello dettaglio */}
        <div className="space-y-4">
          {selected ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Umbrella className="h-5 w-5" />
                  Ombrellone {selected.label}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Badge
                  variant={
                    selected.status === "available"
                      ? "available"
                      : selected.status === "checked_in"
                        ? "available"
                        : "partial"
                  }
                >
                  {STATUS_LABELS[selected.status]}
                </Badge>

                {selected.clientName && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span>{selected.clientName}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span>08:00 - 19:00</span>
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  {selected.status === "available" ? (
                    <Button variant="brand" className="w-full">
                      <Plus className="h-4 w-4" />
                      Assegna rapido
                    </Button>
                  ) : selected.status === "occupied" ? (
                    <Button variant="brand" className="w-full">
                      <QrCode className="h-4 w-4" />
                      Check-in
                    </Button>
                  ) : null}
                  <Button variant="outline" className="w-full" size="sm">
                    Vedi prenotazione
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="flex min-h-[200px] items-center justify-center p-6">
                <p className="text-center text-sm text-muted-foreground">
                  Tocca un ombrellone per vedere i dettagli.
                </p>
              </CardContent>
            </Card>
          )}

          {/* Riepilogo rapido */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Riepilogo oggi</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Totale posti</span>
                <span className="font-medium">{totalElements}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Occupati</span>
                <span className="font-medium">{occupiedCount}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Liberi</span>
                <span className="font-medium text-available">
                  {totalElements - occupiedCount}
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-brand-gradient"
                  style={{ width: `${occupancy}%` }}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

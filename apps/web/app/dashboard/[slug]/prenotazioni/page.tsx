"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Search,
  Filter,
  Plus,
  QrCode,
  Eye,
  X,
  Calendar,
  Umbrella,
  Phone,
  Mail,
} from "lucide-react";

const STATUS_MAP: Record<string, { label: string; variant: "available" | "partial" | "occupied" | "outline" }> = {
  confirmed: { label: "Confermato", variant: "partial" },
  checked_in: { label: "In spiaggia", variant: "available" },
  pending: { label: "In attesa", variant: "outline" },
  completed: { label: "Completato", variant: "outline" },
  cancelled: { label: "Cancellato", variant: "occupied" },
  no_show: { label: "No show", variant: "occupied" },
};

const MOCK_BOOKINGS = [
  {
    id: "1", code: "BK-A3X9P", name: "Mario Rossi", email: "mario@email.it", phone: "+39 333 1234567",
    umbrella: "A3", sunbeds: 2, startDate: "2026-07-15", endDate: "2026-07-15",
    status: "checked_in", total: 45, paidAt: "2026-07-14T10:30:00",
  },
  {
    id: "2", code: "BK-H7K2M", name: "Giulia Bianchi", email: "giulia@email.it", phone: "+39 347 9876543",
    umbrella: "B7", sunbeds: 2, startDate: "2026-07-15", endDate: "2026-07-16",
    status: "confirmed", total: 70, paidAt: "2026-07-13T14:15:00",
  },
  {
    id: "3", code: "BK-R9W4N", name: "Luca Verdi", email: "luca@email.it", phone: "+39 320 5551234",
    umbrella: "C2, C3", sunbeds: 4, startDate: "2026-07-16", endDate: "2026-07-22",
    status: "confirmed", total: 350, paidAt: "2026-07-10T09:00:00",
  },
  {
    id: "4", code: "BK-T5Y8L", name: "Anna Colombo", email: "anna@email.it", phone: "+39 339 7771234",
    umbrella: "A10", sunbeds: 3, startDate: "2026-07-15", endDate: "2026-07-15",
    status: "pending", total: 45, paidAt: null,
  },
  {
    id: "5", code: "BK-M2P6Q", name: "Paolo Ferrari", email: "paolo@email.it", phone: "+39 348 1112222",
    umbrella: "D5", sunbeds: 2, startDate: "2026-07-14", endDate: "2026-07-14",
    status: "completed", total: 20, paidAt: "2026-07-13T18:00:00",
  },
  {
    id: "6", code: "BK-K8N3R", name: "Sara Esposito", email: "sara@email.it", phone: "+39 351 3334444",
    umbrella: "B2", sunbeds: 2, startDate: "2026-07-14", endDate: "2026-07-14",
    status: "no_show", total: 35, paidAt: "2026-07-12T11:30:00",
  },
];

export default function PrenotazioniPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [selectedBooking, setSelectedBooking] = useState<string | null>(null);

  const filtered = MOCK_BOOKINGS.filter((b) => {
    const matchSearch =
      b.name.toLowerCase().includes(search.toLowerCase()) ||
      b.code.toLowerCase().includes(search.toLowerCase()) ||
      b.umbrella.toLowerCase().includes(search.toLowerCase());
    const matchStatus = !statusFilter || b.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const detail = selectedBooking
    ? MOCK_BOOKINGS.find((b) => b.id === selectedBooking)
    : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Prenotazioni</h1>
          <p className="text-muted-foreground">
            Gestisci tutte le prenotazioni del tuo stabilimento.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <QrCode className="h-4 w-4" />
            Scansiona QR
          </Button>
          <Button variant="brand">
            <Plus className="h-4 w-4" />
            Nuova prenotazione
          </Button>
        </div>
      </div>

      {/* Filtri */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Cerca per nome, codice o ombrellone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          {Object.entries(STATUS_MAP).map(([key, { label }]) => (
            <Button
              key={key}
              variant={statusFilter === key ? "default" : "outline"}
              size="sm"
              onClick={() =>
                setStatusFilter(statusFilter === key ? null : key)
              }
            >
              {label}
            </Button>
          ))}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        {/* Lista */}
        <Card>
          <CardContent className="p-0">
            <div className="divide-y">
              {filtered.map((booking) => (
                <button
                  key={booking.id}
                  onClick={() => setSelectedBooking(booking.id)}
                  className={`flex w-full items-center justify-between p-4 text-left transition-colors hover:bg-muted/50 ${
                    selectedBooking === booking.id ? "bg-muted/50" : ""
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted font-mono text-sm font-medium">
                      {booking.umbrella.split(",")[0]}
                    </div>
                    <div>
                      <p className="font-medium">{booking.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {booking.code} &middot; {booking.startDate === booking.endDate
                          ? booking.startDate
                          : `${booking.startDate} → ${booking.endDate}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant={STATUS_MAP[booking.status].variant}>
                      {STATUS_MAP[booking.status].label}
                    </Badge>
                    <span className="font-semibold">{booking.total}&euro;</span>
                  </div>
                </button>
              ))}
              {filtered.length === 0 && (
                <div className="p-8 text-center text-muted-foreground">
                  Nessuna prenotazione trovata.
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Dettaglio */}
        {detail ? (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Dettaglio</CardTitle>
              <button
                onClick={() => setSelectedBooking(null)}
                className="rounded-md p-1 hover:bg-muted"
              >
                <X className="h-4 w-4" />
              </button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-mono text-sm text-muted-foreground">
                  {detail.code}
                </span>
                <Badge variant={STATUS_MAP[detail.status].variant}>
                  {STATUS_MAP[detail.status].label}
                </Badge>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <Umbrella className="h-4 w-4 text-muted-foreground" />
                  <span>
                    Ombrellone {detail.umbrella} &middot; {detail.sunbeds} lettini
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>
                    {detail.startDate === detail.endDate
                      ? detail.startDate
                      : `${detail.startDate} → ${detail.endDate}`}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span>{detail.phone}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span>{detail.email}</span>
                </div>
              </div>

              <div className="rounded-lg bg-muted p-3">
                <div className="flex items-center justify-between text-lg font-bold">
                  <span>Totale</span>
                  <span>{detail.total}&euro;</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {detail.paidAt
                    ? `Pagato il ${detail.paidAt.split("T")[0]}`
                    : "Non ancora pagato"}
                </p>
              </div>

              <div className="space-y-2">
                {detail.status === "confirmed" && (
                  <Button variant="brand" className="w-full">
                    <QrCode className="h-4 w-4" />
                    Check-in
                  </Button>
                )}
                {detail.status === "pending" && (
                  <Button variant="brand" className="w-full">
                    Conferma prenotazione
                  </Button>
                )}
                <Button variant="outline" className="w-full">
                  <Eye className="h-4 w-4" />
                  Mostra QR Code
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="flex min-h-[300px] items-center justify-center p-6">
              <p className="text-center text-sm text-muted-foreground">
                Seleziona una prenotazione per vedere i dettagli.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

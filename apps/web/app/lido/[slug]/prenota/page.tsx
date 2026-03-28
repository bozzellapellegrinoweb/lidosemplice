"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Umbrella,
  ArrowLeft,
  ArrowRight,
  Plus,
  Minus,
  ShoppingCart,
  Calendar,
  CreditCard,
  Check,
} from "lucide-react";

// Mock data — in produzione verra' dal database
const ROWS = [
  {
    number: 1,
    label: "Prima fila",
    price: 45,
    umbrellas: Array.from({ length: 10 }, (_, i) => ({
      id: `A${i + 1}`,
      label: `A${i + 1}`,
      available: i !== 2 && i !== 7,
    })),
  },
  {
    number: 2,
    label: "Seconda fila",
    price: 35,
    umbrellas: Array.from({ length: 12 }, (_, i) => ({
      id: `B${i + 1}`,
      label: `B${i + 1}`,
      available: i !== 0 && i !== 5 && i !== 9,
    })),
  },
  {
    number: 3,
    label: "Terza fila",
    price: 25,
    umbrellas: Array.from({ length: 12 }, (_, i) => ({
      id: `C${i + 1}`,
      label: `C${i + 1}`,
      available: i !== 3 && i !== 11,
    })),
  },
  {
    number: 4,
    label: "Quarta fila",
    price: 20,
    umbrellas: Array.from({ length: 14 }, (_, i) => ({
      id: `D${i + 1}`,
      label: `D${i + 1}`,
      available: i !== 1 && i !== 6,
    })),
  },
];

const SERVICES = [
  { id: "towel", name: "Asciugamano mare", price: 15 },
  { id: "shower", name: "Doccia calda", price: 2 },
  { id: "parking", name: "Parcheggio", price: 5 },
];

interface SelectedItem {
  id: string;
  label: string;
  rowLabel: string;
  price: number;
  sunbeds: number;
}

export default function BookingPage() {
  const params = useParams();
  const slug = params.slug as string;

  const [step, setStep] = useState(1); // 1: mappa, 2: servizi, 3: riepilogo
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([]);
  const [selectedServices, setSelectedServices] = useState<
    Record<string, number>
  >({});

  function toggleUmbrella(
    id: string,
    label: string,
    rowLabel: string,
    price: number
  ) {
    setSelectedItems((prev) => {
      const existing = prev.find((item) => item.id === id);
      if (existing) {
        return prev.filter((item) => item.id !== id);
      }
      return [...prev, { id, label, rowLabel, price, sunbeds: 2 }];
    });
  }

  function updateSunbeds(id: string, delta: number) {
    setSelectedItems((prev) =>
      prev.map((item) =>
        item.id === id
          ? { ...item, sunbeds: Math.max(0, Math.min(4, item.sunbeds + delta)) }
          : item
      )
    );
  }

  function toggleService(serviceId: string) {
    setSelectedServices((prev) => {
      const current = prev[serviceId] || 0;
      if (current > 0) {
        const next = { ...prev };
        delete next[serviceId];
        return next;
      }
      return { ...prev, [serviceId]: 1 };
    });
  }

  const days =
    startDate && endDate
      ? Math.max(
          1,
          Math.ceil(
            (new Date(endDate).getTime() - new Date(startDate).getTime()) /
              86400000
          ) + 1
        )
      : 1;

  const umbrellaTotal = selectedItems.reduce(
    (sum, item) => sum + item.price * days,
    0
  );

  const servicesTotal = Object.entries(selectedServices).reduce(
    (sum, [serviceId, qty]) => {
      const service = SERVICES.find((s) => s.id === serviceId);
      return sum + (service?.price || 0) * qty * days;
    },
    0
  );

  const total = umbrellaTotal + servicesTotal;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b bg-card/80 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <Link
              href={`/lido/${slug}`}
              className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-muted"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <h1 className="text-lg font-bold">Prenota</h1>
          </div>

          {/* Steps */}
          <div className="hidden items-center gap-2 sm:flex">
            {["Mappa", "Servizi", "Pagamento"].map((s, i) => (
              <div key={s} className="flex items-center gap-2">
                <button
                  onClick={() => i + 1 <= step && setStep(i + 1)}
                  className={`flex h-7 items-center gap-1.5 rounded-full px-3 text-xs font-medium transition-colors ${
                    i + 1 === step
                      ? "bg-brand-azure text-white"
                      : i + 1 < step
                        ? "bg-available/15 text-available"
                        : "bg-muted text-muted-foreground"
                  }`}
                >
                  {i + 1 < step ? (
                    <Check className="h-3 w-3" />
                  ) : (
                    <span>{i + 1}</span>
                  )}
                  {s}
                </button>
                {i < 2 && (
                  <div className="h-px w-4 bg-border" />
                )}
              </div>
            ))}
          </div>

          {/* Carrello mini */}
          <div className="flex items-center gap-2">
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-semibold">
              {total > 0 ? `${total}\u20AC` : "0\u20AC"}
            </span>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-6">
        {/* Date picker */}
        <div className="mb-6 flex flex-wrap items-end gap-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium">
              <Calendar className="mr-1 inline h-4 w-4" />
              Data arrivo
            </label>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-44"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">
              Data partenza
            </label>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              min={startDate}
              className="w-44"
            />
          </div>
          {days > 1 && (
            <Badge variant="secondary" className="mb-1">
              {days} giorni
            </Badge>
          )}
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          {/* Colonna principale */}
          <div>
            {step === 1 && (
              <>
                {/* MAPPA SPIAGGIA */}
                <Card>
                  <CardContent className="p-4 sm:p-6">
                    {/* Mare */}
                    <div className="mb-4 flex h-12 items-center justify-center rounded-lg bg-gradient-to-r from-brand-cyan/15 via-brand-azure/15 to-brand-blue/15">
                      <span className="text-sm font-medium text-brand-azure">
                        MARE
                      </span>
                    </div>

                    {/* File */}
                    <div className="space-y-4">
                      {ROWS.map((row) => (
                        <div key={row.number}>
                          <div className="mb-2 flex items-center justify-between">
                            <span className="text-sm font-medium">
                              {row.label}
                            </span>
                            <span className="text-sm text-muted-foreground">
                              da {row.price}&euro;/giorno
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {row.umbrellas.map((umb) => {
                              const isSelected = selectedItems.some(
                                (item) => item.id === umb.id
                              );
                              return (
                                <button
                                  key={umb.id}
                                  disabled={!umb.available}
                                  onClick={() =>
                                    toggleUmbrella(
                                      umb.id,
                                      umb.label,
                                      row.label,
                                      row.price
                                    )
                                  }
                                  className={`flex h-12 w-12 flex-col items-center justify-center rounded-lg border-2 text-xs font-medium transition-all sm:h-14 sm:w-14 ${
                                    !umb.available
                                      ? "cursor-not-allowed border-occupied/30 bg-occupied/10 text-occupied/50"
                                      : isSelected
                                        ? "border-brand-azure bg-brand-azure/20 text-brand-azure ring-2 ring-brand-azure/30"
                                        : "border-available/30 bg-available/10 text-available hover:border-available/60 hover:bg-available/20"
                                  }`}
                                >
                                  <Umbrella className="h-4 w-4" />
                                  <span className="mt-0.5">{umb.label}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Legenda */}
                    <div className="mt-4 flex flex-wrap items-center gap-4 border-t pt-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1.5">
                        <span className="h-3 w-3 rounded-full bg-available/40" />
                        Disponibile
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="h-3 w-3 rounded-full bg-occupied/40" />
                        Occupato
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="h-3 w-3 rounded-full bg-brand-azure" />
                        Selezionato
                      </span>
                    </div>
                  </CardContent>
                </Card>

                {/* Lettini per ombrellone selezionato */}
                {selectedItems.length > 0 && (
                  <Card className="mt-4">
                    <CardHeader>
                      <CardTitle className="text-lg">
                        Lettini per ombrellone
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {selectedItems.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between rounded-lg border p-3"
                        >
                          <div>
                            <span className="font-medium">
                              Ombrellone {item.label}
                            </span>
                            <span className="ml-2 text-sm text-muted-foreground">
                              {item.rowLabel}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => updateSunbeds(item.id, -1)}
                              className="flex h-8 w-8 items-center justify-center rounded-md border hover:bg-muted"
                            >
                              <Minus className="h-3 w-3" />
                            </button>
                            <span className="w-8 text-center font-medium">
                              {item.sunbeds}
                            </span>
                            <button
                              onClick={() => updateSunbeds(item.id, 1)}
                              className="flex h-8 w-8 items-center justify-center rounded-md border hover:bg-muted"
                            >
                              <Plus className="h-3 w-3" />
                            </button>
                            <span className="text-sm text-muted-foreground">
                              lettini
                            </span>
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}
              </>
            )}

            {step === 2 && (
              <Card>
                <CardHeader>
                  <CardTitle>Servizi aggiuntivi</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {SERVICES.map((service) => {
                    const isSelected =
                      (selectedServices[service.id] || 0) > 0;
                    return (
                      <button
                        key={service.id}
                        onClick={() => toggleService(service.id)}
                        className={`flex w-full items-center justify-between rounded-lg border-2 p-4 text-left transition-all ${
                          isSelected
                            ? "border-brand-azure bg-brand-azure/5"
                            : "border-border hover:border-brand-azure/30"
                        }`}
                      >
                        <div>
                          <p className="font-medium">{service.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {service.price}&euro;/giorno
                          </p>
                        </div>
                        <div
                          className={`flex h-6 w-6 items-center justify-center rounded-full ${
                            isSelected
                              ? "bg-brand-azure text-white"
                              : "border-2 border-border"
                          }`}
                        >
                          {isSelected && <Check className="h-4 w-4" />}
                        </div>
                      </button>
                    );
                  })}
                </CardContent>
              </Card>
            )}

            {step === 3 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5" />
                    Completa la prenotazione
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium">
                      Nome e cognome
                    </label>
                    <Input placeholder="Mario Rossi" />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium">
                      Email
                    </label>
                    <Input type="email" placeholder="mario@email.it" />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium">
                      Telefono
                    </label>
                    <Input type="tel" placeholder="+39 333 123 4567" />
                  </div>

                  <div className="rounded-lg bg-muted p-4">
                    <p className="text-sm text-muted-foreground">
                      Il pagamento verra elaborato in modo sicuro tramite
                      Stripe. I tuoi dati sono protetti.
                    </p>
                  </div>

                  <Button variant="brand" size="xl" className="w-full">
                    Paga {total}&euro;
                    <CreditCard className="h-5 w-5" />
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar carrello */}
          <div className="lg:sticky lg:top-20">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <ShoppingCart className="h-5 w-5" />
                  Riepilogo
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {selectedItems.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Seleziona un ombrellone dalla mappa per iniziare.
                  </p>
                ) : (
                  <>
                    {selectedItems.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between text-sm"
                      >
                        <span>
                          Omb. {item.label} ({item.sunbeds} lett.)
                        </span>
                        <span className="font-medium">
                          {item.price * days}&euro;
                        </span>
                      </div>
                    ))}

                    {Object.entries(selectedServices).map(
                      ([serviceId, qty]) => {
                        const service = SERVICES.find(
                          (s) => s.id === serviceId
                        );
                        if (!service || qty === 0) return null;
                        return (
                          <div
                            key={serviceId}
                            className="flex items-center justify-between text-sm"
                          >
                            <span>{service.name}</span>
                            <span className="font-medium">
                              {service.price * qty * days}&euro;
                            </span>
                          </div>
                        );
                      }
                    )}

                    <div className="border-t pt-3">
                      <div className="flex items-center justify-between text-lg font-bold">
                        <span>Totale</span>
                        <span>{total}&euro;</span>
                      </div>
                      {days > 1 && (
                        <p className="text-xs text-muted-foreground">
                          per {days} giorni
                        </p>
                      )}
                    </div>
                  </>
                )}

                {/* Bottoni navigazione */}
                <div className="space-y-2 pt-2">
                  {step < 3 && (
                    <Button
                      variant="brand"
                      className="w-full"
                      disabled={selectedItems.length === 0}
                      onClick={() => setStep(step + 1)}
                    >
                      Continua
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  )}
                  {step > 1 && (
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => setStep(step - 1)}
                    >
                      <ArrowLeft className="h-4 w-4" />
                      Indietro
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

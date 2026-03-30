"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
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
  Loader2,
  Home,
  Tent,
  BedSingle,
  Wallet,
  Banknote,
} from "lucide-react";
import QRCode from "qrcode";
import { createClient } from "@/lib/supabase/client";
import { generateBookingCode } from "@/lib/utils";

interface MapRow {
  id: string;
  label: string;
  row_number: number;
  beach_map_id?: string;
  mapName?: string;
}

interface MapElement {
  id: string;
  map_row_id: string;
  element_type: string;
  label: string;
  max_sunbeds: number;
  is_premium: boolean;
}

const ELEMENT_ICONS: Record<string, typeof Umbrella> = {
  umbrella: Umbrella,
  cabana: Home,
  gazebo: Tent,
  sunbed: BedSingle,
};

const ELEMENT_LABELS: Record<string, string> = {
  umbrella: "Ombrellone",
  cabana: "Cabana",
  gazebo: "Gazebo",
  sunbed: "Lettino",
};

const ELEMENT_CAP_LABELS: Record<string, string> = {
  umbrella: "lettini",
  cabana: "persone",
  gazebo: "persone",
  sunbed: "posti",
};

interface Service {
  id: string;
  name: string;
  description: string;
  price_cents: number;
}

interface SelectedItem {
  id: string;
  label: string;
  elementType: string;
  rowLabel: string;
  rowNumber: number;
  sunbeds: number;
  maxSunbeds: number;
}

interface PricingRule {
  row_number: number;
  season_id: string;
  duration_type: string;
  element_type: string;
  price_cents: number;
}

interface Season {
  id: string;
  season_type: string;
  start_date: string;
  end_date: string;
}

export default function BookingPage() {
  const params = useParams();
  const slug = params.slug as string;
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [establishmentId, setEstablishmentId] = useState<string | null>(null);
  const [establishmentName, setEstablishmentName] = useState("");
  const [rows, setRows] = useState<(MapRow & { elements: MapElement[] })[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [occupiedIds, setOccupiedIds] = useState<Set<string>>(new Set());

  const [step, setStep] = useState(1);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([]);
  const [serviceQtys, setServiceQtys] = useState<Record<string, number>>({});
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [pricingRules, setPricingRules] = useState<PricingRule[]>([]);
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<"stripe" | "paypal" | "onsite">("stripe");
  const [paypalEnabled, setPaypalEnabled] = useState(false);
  const [primaryColor, setPrimaryColor] = useState("#0080ff");
  const [bookingConfirmed, setBookingConfirmed] = useState<{ code: string; total: number; qrToken: string } | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>("");

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  useEffect(() => {
    if (establishmentId && startDate && endDate) {
      loadAvailability();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startDate, endDate, establishmentId]);

  async function loadData() {
    const supabase = createClient();

    const { data: est } = await supabase
      .from("establishments")
      .select("id, name, paypal_enabled, primary_color")
      .eq("slug", slug)
      .eq("is_active", true)
      .single();

    if (!est) return;
    setEstablishmentId(est.id);
    setEstablishmentName(est.name);
    setPaypalEnabled(est.paypal_enabled || false);
    if (est.primary_color) setPrimaryColor(est.primary_color);

    // Load ALL active maps
    const { data: mapsData } = await supabase
      .from("beach_maps")
      .select("id, name")
      .eq("establishment_id", est.id)
      .eq("is_active", true)
      .order("created_at");

    if (mapsData && mapsData.length > 0) {
      const mapIds = mapsData.map((m) => m.id);

      const { data: mapRows } = await supabase
        .from("map_rows")
        .select("id, label, row_number, beach_map_id")
        .in("beach_map_id", mapIds)
        .order("row_number");

      if (mapRows) {
        const rowIds = mapRows.map((r) => r.id);
        const { data: elementsData } = await supabase
          .from("map_elements")
          .select("id, map_row_id, element_type, label, max_sunbeds, is_premium")
          .in("map_row_id", rowIds)
          .eq("is_active", true)
          .order("position_x");

        const rowsWithElements = mapRows.map((r) => ({
          ...r,
          mapName: mapsData.find((m) => m.id === r.beach_map_id)?.name || "",
          elements: (elementsData || []).filter((e) => e.map_row_id === r.id),
        }));
        setRows(rowsWithElements);
      }
    }

    // Load services
    const { data: servicesData } = await supabase
      .from("additional_services")
      .select("id, name, description, price_cents")
      .eq("establishment_id", est.id)
      .eq("is_active", true)
      .order("sort_order");

    if (servicesData) setServices(servicesData);

    // Load seasons and pricing rules
    const { data: seasonsData } = await supabase
      .from("seasons")
      .select("id, season_type, start_date, end_date")
      .eq("establishment_id", est.id);
    if (seasonsData) setSeasons(seasonsData);

    const { data: rulesData } = await supabase
      .from("pricing_rules")
      .select("row_number, season_id, duration_type, price_cents")
      .eq("establishment_id", est.id);
    if (rulesData) setPricingRules(rulesData as PricingRule[]);

    setLoading(false);
  }

  async function loadAvailability() {
    if (!establishmentId) return;
    // Usa API route con admin client per bypassare la RLS su bookings
    const res = await fetch(
      `/api/availability?establishment_id=${establishmentId}&start_date=${startDate}&end_date=${endDate}`
    );
    if (!res.ok) return;
    const { occupiedIds: ids } = await res.json() as { occupiedIds: string[] };
    const occupied = new Set<string>(ids);
    setOccupiedIds(occupied);
    setSelectedItems((prev) => prev.filter((item) => !occupied.has(item.id)));
  }

  function toggleUmbrella(element: MapElement, row: MapRow) {
    setSelectedItems((prev) => {
      const existing = prev.find((item) => item.id === element.id);
      if (existing) return prev.filter((item) => item.id !== element.id);
      return [
        ...prev,
        {
          id: element.id,
          label: element.label,
          elementType: element.element_type || "umbrella",
          rowLabel: row.label,
          rowNumber: row.row_number,
          sunbeds: Math.min(2, element.max_sunbeds),
          maxSunbeds: element.max_sunbeds,
        },
      ];
    });
  }

  function updateSunbeds(id: string, delta: number) {
    setSelectedItems((prev) =>
      prev.map((item) =>
        item.id === id
          ? { ...item, sunbeds: Math.max(0, Math.min(item.maxSunbeds, item.sunbeds + delta)) }
          : item
      )
    );
  }

  function adjustServiceQty(serviceId: string, delta: number) {
    setServiceQtys((prev) => {
      const current = prev[serviceId] || 0;
      const next = Math.max(0, current + delta);
      if (next === 0) {
        const { [serviceId]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [serviceId]: next };
    });
  }

  const days =
    startDate && endDate
      ? Math.max(
          1,
          Math.ceil(
            (new Date(endDate).getTime() - new Date(startDate).getTime()) / 86400000
          ) + 1
        )
      : 1;

  // Price lookup: use pricing_rules from DB, fallback to hardcoded
  const FALLBACK_PRICES: Record<number, number> = { 1: 45, 2: 35, 3: 25, 4: 20 };
  function getPrice(rowNumber: number, elementType: string = "umbrella"): number {
    if (pricingRules.length === 0) return FALLBACK_PRICES[rowNumber] || 15;

    // Find current season based on start date
    const bookingDate = startDate || new Date().toISOString().split("T")[0];
    const currentSeason = seasons.find(
      (s) => bookingDate >= s.start_date && bookingDate <= s.end_date
    );

    if (currentSeason) {
      // Look for full_day price for this row, season, and element type
      const rule = pricingRules.find(
        (r) => r.row_number === rowNumber && r.season_id === currentSeason.id && r.duration_type === "full_day" && r.element_type === elementType
      );
      if (rule) return rule.price_cents / 100;

      // Fallback: try without element_type match (umbrella default)
      const fallbackRule = pricingRules.find(
        (r) => r.row_number === rowNumber && r.season_id === currentSeason.id && r.duration_type === "full_day"
      );
      if (fallbackRule) return fallbackRule.price_cents / 100;
    }

    // Fallback: any full_day rule for this row + element type
    const anyRule = pricingRules.find(
      (r) => r.row_number === rowNumber && r.duration_type === "full_day" && r.element_type === elementType
    );
    if (anyRule) return anyRule.price_cents / 100;

    // Fallback: any full_day rule for this row
    const anyRowRule = pricingRules.find(
      (r) => r.row_number === rowNumber && r.duration_type === "full_day"
    );
    if (anyRowRule) return anyRowRule.price_cents / 100;

    return FALLBACK_PRICES[rowNumber] || 15;
  }

  const umbrellaTotal = selectedItems.reduce(
    (sum, item) => sum + getPrice(item.rowNumber, item.elementType) * days,
    0
  );

  const servicesTotal = services
    .reduce((sum, s) => sum + (s.price_cents / 100) * (serviceQtys[s.id] || 0) * days, 0);

  const total = umbrellaTotal + servicesTotal;

  async function handleBooking() {
    if (!establishmentId || !guestName || !startDate || !endDate) return;
    if (paymentMethod !== "onsite" && !guestEmail) return;
    setSubmitting(true);

    const supabase = createClient();
    const bookingCode = generateBookingCode();
    const qrToken = crypto.randomUUID();

    const { data: booking, error } = await supabase
      .from("bookings")
      .insert({
        establishment_id: establishmentId,
        booking_code: bookingCode,
        guest_name: guestName,
        guest_email: guestEmail,
        guest_phone: guestPhone,
        start_date: startDate,
        end_date: endDate,
        duration: "full_day",
        status: paymentMethod === "onsite" ? "pending" : "confirmed",
        payment_method: paymentMethod,
        total_cents: Math.round(total * 100),
        qr_code_token: qrToken,
      })
      .select("id")
      .single();

    if (error || !booking) {
      alert("Errore nella prenotazione: " + (error?.message || "sconosciuto"));
      setSubmitting(false);
      return;
    }

    // Insert booking items
    const items = selectedItems.map((item) => ({
      booking_id: booking.id,
      map_element_id: item.id,
      sunbeds_count: item.sunbeds,
      price_cents: Math.round(getPrice(item.rowNumber, item.elementType) * days * 100),
    }));

    await supabase.from("booking_items").insert(items);

    // Insert booking services (con quantità)
    const bookingServices = services
      .filter((s) => (serviceQtys[s.id] || 0) > 0)
      .map((s) => ({
        booking_id: booking.id,
        service_id: s.id,
        quantity: serviceQtys[s.id],
        price_cents: s.price_cents * days,
      }));

    if (bookingServices.length > 0) {
      await supabase.from("booking_services").insert(bookingServices);
    }

    // Send confirmation email
    fetch("/api/email/booking-confirmation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bookingId: booking.id }),
    }).catch(console.error);

    // Mostra schermata di conferma (niente alert() nativo che viene bloccato su mobile)
    const qrDataUrlGenerated = await QRCode.toDataURL(qrToken, { width: 250, margin: 2 });
    setQrDataUrl(qrDataUrlGenerated);
    setBookingConfirmed({ code: bookingCode, total: Math.round(total * 100), qrToken });
  }

  // Schermata di conferma prenotazione completata
  if (bookingConfirmed) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="w-full max-w-sm text-center">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-available/15">
            <Check className="h-10 w-10 text-available" />
          </div>
          <h1 className="mb-2 text-2xl font-black">Prenotazione confermata!</h1>
          <p className="mb-4 text-muted-foreground">
            Mostra questo QR code all&apos;arrivo per il check-in.
          </p>

          {/* QR Code */}
          {qrDataUrl && (
            <div className="mx-auto mb-4 inline-block rounded-2xl border-4 border-brand-azure bg-white p-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qrDataUrl} alt="QR check-in" width={200} height={200} className="block" />
            </div>
          )}

          <div className="mb-6 rounded-xl border bg-muted/50 p-5 text-left space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Codice prenotazione</span>
              <span className="font-mono font-bold text-brand-azure">{bookingConfirmed.code}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Totale</span>
              <span className="text-lg font-black">{(bookingConfirmed.total / 100).toFixed(2)}&euro;</span>
            </div>
          </div>
          <Button variant="brand" size="xl" className="w-full" onClick={() => router.push(`/lido/${slug}`)}>
            Torna alla pagina del lido
          </Button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-brand-azure" />
      </div>
    );
  }

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
            <h1 className="text-lg font-bold">Prenota — {establishmentName}</h1>
          </div>

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
                  {i + 1 < step ? <Check className="h-3 w-3" /> : <span>{i + 1}</span>}
                  {s}
                </button>
                {i < 2 && <div className="h-px w-4 bg-border" />}
              </div>
            ))}
          </div>

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
            <label className="mb-1.5 block text-sm font-medium">Data partenza</label>
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
          {(!startDate || !endDate) && (
            <p className="mb-1 text-sm text-destructive">
              Seleziona le date per procedere con la prenotazione.
            </p>
          )}
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <div>
            {step === 1 && (
              <>
                {rows.length === 0 ? (
                  <Card>
                    <CardContent className="flex min-h-[200px] items-center justify-center p-6">
                      <p className="text-muted-foreground">
                        La mappa non è ancora disponibile.
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  (() => {
                    // Group rows by zone
                    const zones = new Map<string, typeof rows>();
                    rows.forEach((row) => {
                      const key = row.mapName || "Spiaggia";
                      if (!zones.has(key)) zones.set(key, []);
                      zones.get(key)!.push(row);
                    });

                    return Array.from(zones.entries()).map(([zoneName, zoneRows]) => (
                      <Card key={zoneName} className="mb-4">
                        <CardContent className="p-4 sm:p-6">
                          <div className="mb-4 flex h-12 items-center justify-center rounded-lg bg-gradient-to-r from-brand-cyan/15 via-brand-azure/15 to-brand-blue/15">
                            <span className="text-sm font-medium text-brand-azure">
                              {zoneName.toUpperCase()}
                            </span>
                          </div>

                          <div className="space-y-4">
                            {zoneRows.map((row) => (
                              <div key={row.id}>
                                <div className="mb-2 flex items-center justify-between">
                                  <span className="text-sm font-medium">{row.label}</span>
                                  <span className="text-sm text-muted-foreground">
                                    da {getPrice(row.row_number)}&euro;/giorno
                                  </span>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                  {row.elements.map((el) => {
                                    const isOccupied = occupiedIds.has(el.id);
                                    const isSelected = selectedItems.some((item) => item.id === el.id);

                                    const ElIcon = ELEMENT_ICONS[el.element_type] || Umbrella;
                                    const isBig = el.element_type === "cabana" || el.element_type === "gazebo";
                                    return (
                                      <button
                                        key={el.id}
                                        disabled={isOccupied}
                                        onClick={() => toggleUmbrella(el, row)}
                                        className={`flex ${isBig ? "h-12 w-16 sm:h-14 sm:w-20" : "h-12 w-12 sm:h-14 sm:w-14"} flex-col items-center justify-center rounded-lg border-2 text-xs font-medium transition-all ${
                                          isOccupied
                                            ? "cursor-not-allowed border-occupied/30 bg-occupied/10 text-occupied/50"
                                            : isSelected
                                              ? ""
                                              : "border-available/30 bg-available/10 text-available hover:border-available/60 hover:bg-available/20"
                                        }`}
                                        style={isSelected && !isOccupied ? {
                                          borderColor: primaryColor,
                                          backgroundColor: primaryColor + "30",
                                          color: primaryColor,
                                          boxShadow: `0 0 0 2px ${primaryColor}50`,
                                        } : undefined}
                                      >
                                        <ElIcon className="h-4 w-4" />
                                        <span className="mt-0.5">{el.label}</span>
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    ));
                  })()
                )}

                <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
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

                {selectedItems.length > 0 && (
                  <Card className="mt-4">
                    <CardHeader>
                      <CardTitle className="text-lg">Dettaglio selezione</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {selectedItems.map((item) => {
                        const ItemIcon = ELEMENT_ICONS[item.elementType] || Umbrella;
                        const itemLabel = ELEMENT_LABELS[item.elementType] || "Ombrellone";
                        const capLabel = ELEMENT_CAP_LABELS[item.elementType] || "lettini";
                        return (
                        <div key={item.id} className="flex items-center justify-between rounded-lg border p-3">
                          <div className="flex items-center gap-2">
                            <ItemIcon className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">{itemLabel} {item.label}</span>
                            <span className="text-sm text-muted-foreground">{item.rowLabel}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => updateSunbeds(item.id, -1)}
                              className="flex h-8 w-8 items-center justify-center rounded-md border hover:bg-muted"
                            >
                              <Minus className="h-3 w-3" />
                            </button>
                            <span className="w-8 text-center font-medium">{item.sunbeds}</span>
                            <button
                              onClick={() => updateSunbeds(item.id, 1)}
                              className="flex h-8 w-8 items-center justify-center rounded-md border hover:bg-muted"
                            >
                              <Plus className="h-3 w-3" />
                            </button>
                            <span className="text-sm text-muted-foreground">{capLabel}</span>
                          </div>
                        </div>
                        );
                      })}
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
                  {services.length === 0 ? (
                    <p className="py-8 text-center text-sm text-muted-foreground">
                      Nessun servizio aggiuntivo disponibile.
                    </p>
                  ) : (
                    services.map((service) => {
                      const qty = serviceQtys[service.id] || 0;
                      return (
                        <div
                          key={service.id}
                          className={`flex items-center justify-between rounded-lg border-2 p-4 transition-all ${
                            qty > 0 ? "border-brand-azure bg-brand-azure/5" : "border-border"
                          }`}
                        >
                          <div>
                            <p className="font-medium">{service.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {(service.price_cents / 100).toFixed(2)}&euro;/giorno
                            </p>
                          </div>
                          {/* Contatore quantità */}
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => adjustServiceQty(service.id, -1)}
                              disabled={qty === 0}
                              className="flex h-8 w-8 items-center justify-center rounded-md border hover:bg-muted disabled:opacity-30"
                            >
                              <Minus className="h-3 w-3" />
                            </button>
                            <span className="w-6 text-center font-bold">{qty}</span>
                            <button
                              onClick={() => adjustServiceQty(service.id, 1)}
                              className="flex h-8 w-8 items-center justify-center rounded-md border hover:bg-muted"
                            >
                              <Plus className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
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
                    <label className="mb-1.5 block text-sm font-medium">Nome e cognome</label>
                    <Input
                      placeholder="Mario Rossi"
                      value={guestName}
                      onChange={(e) => setGuestName(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium">Email</label>
                    <Input
                      type="email"
                      placeholder="mario@email.it"
                      value={guestEmail}
                      onChange={(e) => setGuestEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium">Telefono</label>
                    <Input
                      type="tel"
                      placeholder="+39 333 123 4567"
                      value={guestPhone}
                      onChange={(e) => setGuestPhone(e.target.value)}
                    />
                  </div>

                  {/* Metodo di pagamento */}
                  <div>
                    <label className="mb-2 block text-sm font-medium">Metodo di pagamento</label>
                    <div className="grid gap-2">
                      <button
                        type="button"
                        onClick={() => setPaymentMethod("stripe")}
                        className={`flex items-center gap-3 rounded-lg border-2 p-3 text-left text-sm transition-all ${
                          paymentMethod === "stripe"
                            ? "border-brand-azure bg-brand-azure/5"
                            : "border-gray-200 hover:border-gray-300"
                        }`}
                      >
                        <CreditCard className={`h-5 w-5 ${paymentMethod === "stripe" ? "text-brand-azure" : "text-muted-foreground"}`} />
                        <div>
                          <p className="font-medium">Carta di credito/debito</p>
                          <p className="text-xs text-muted-foreground">Pagamento sicuro con Stripe</p>
                        </div>
                      </button>

                      {paypalEnabled && (
                        <button
                          type="button"
                          onClick={() => setPaymentMethod("paypal")}
                          className={`flex items-center gap-3 rounded-lg border-2 p-3 text-left text-sm transition-all ${
                            paymentMethod === "paypal"
                              ? "border-[#0070ba] bg-[#0070ba]/5"
                              : "border-gray-200 hover:border-gray-300"
                          }`}
                        >
                          <Wallet className={`h-5 w-5 ${paymentMethod === "paypal" ? "text-[#0070ba]" : "text-muted-foreground"}`} />
                          <div>
                            <p className="font-medium">PayPal</p>
                            <p className="text-xs text-muted-foreground">Paga con il tuo conto PayPal</p>
                          </div>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => setPaymentMethod("onsite")}
                        className={`flex items-center gap-3 rounded-lg border-2 p-3 text-left text-sm transition-all ${
                          paymentMethod === "onsite"
                            ? "border-green-500 bg-green-50"
                            : "border-gray-200 hover:border-gray-300"
                        }`}
                      >
                        <Banknote className={`h-5 w-5 ${paymentMethod === "onsite" ? "text-green-600" : "text-muted-foreground"}`} />
                        <div>
                          <p className="font-medium">Paga in loco</p>
                          <p className="text-xs text-muted-foreground">Contanti o POS al check-in</p>
                        </div>
                      </button>
                    </div>
                  </div>

                  <Button
                    variant="brand"
                    size="xl"
                    className={`w-full ${paymentMethod === "onsite" ? "!bg-green-600 hover:!bg-green-700" : ""}`}
                    disabled={submitting || !guestName || !startDate || !endDate || (paymentMethod !== "onsite" && !guestEmail)}
                    onClick={handleBooking}
                  >
                    {submitting ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : paymentMethod === "onsite" ? (
                      <>
                        Prenota — {total}&euro; (paghi al lido)
                        <Banknote className="h-5 w-5" />
                      </>
                    ) : paymentMethod === "paypal" ? (
                      <>
                        Paga con PayPal — {total}&euro;
                        <Wallet className="h-5 w-5" />
                      </>
                    ) : (
                      <>
                        Prenota e paga — {total}&euro;
                        <CreditCard className="h-5 w-5" />
                      </>
                    )}
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
                    {selectedItems.map((item) => {
                      const shortLabel = ELEMENT_LABELS[item.elementType]?.slice(0, 3) || "Omb";
                      return (
                      <div key={item.id} className="flex items-center justify-between text-sm">
                        <span>
                          {shortLabel}. {item.label} ({item.sunbeds} {ELEMENT_CAP_LABELS[item.elementType]?.slice(0, 4) || "lett"}.)
                        </span>
                        <span className="font-medium">{getPrice(item.rowNumber, item.elementType) * days}&euro;</span>
                      </div>
                      );
                    })}

                    {services
                      .filter((s) => (serviceQtys[s.id] || 0) > 0)
                      .map((service) => (
                        <div key={service.id} className="flex items-center justify-between text-sm">
                          <span>{service.name} ×{serviceQtys[service.id]}</span>
                          <span className="font-medium">
                            {((service.price_cents / 100) * (serviceQtys[service.id] || 0) * days).toFixed(2)}&euro;
                          </span>
                        </div>
                      ))}

                    <div className="border-t pt-3">
                      <div className="flex items-center justify-between text-lg font-bold">
                        <span>Totale</span>
                        <span>{total}&euro;</span>
                      </div>
                      {days > 1 && (
                        <p className="text-xs text-muted-foreground">per {days} giorni</p>
                      )}
                    </div>
                  </>
                )}

                <div className="space-y-2 pt-2">
                  {step < 3 && (
                    <Button
                      variant="brand"
                      className="w-full"
                      disabled={selectedItems.length === 0 || !startDate || !endDate}
                      onClick={() => setStep(step + 1)}
                    >
                      Continua
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  )}
                  {step > 1 && (
                    <Button variant="outline" className="w-full" onClick={() => setStep(step - 1)}>
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

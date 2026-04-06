"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
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
  Building,
} from "lucide-react";
import QRCode from "qrcode";
import { createClient } from "@/lib/supabase/client";

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
  const searchParams = useSearchParams();
  const [startDate, setStartDate] = useState(searchParams.get("start") ?? "");
  const [endDate, setEndDate] = useState(searchParams.get("end") ?? "");
  const [durationType, setDurationType] = useState<"full_day" | "half_day">("full_day");
  const [halfPeriod, setHalfPeriod] = useState<"morning" | "afternoon">("morning");
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([]);
  const [serviceQtys, setServiceQtys] = useState<Record<string, number>>({});
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [pricingRules, setPricingRules] = useState<PricingRule[]>([]);
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<string>("cash");
  const [paymentMethods, setPaymentMethods] = useState<Record<string, Record<string, unknown>>>({});
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

    // Use /api/booking-config to get payment methods without sensitive credentials
    const configRes = await fetch(`/api/booking-config?slug=${slug}`);
    const config = configRes.ok ? await configRes.json() : null;

    if (!config) return;
    setEstablishmentId(config.id);
    setEstablishmentName(config.name);
    if (config.primary_color) setPrimaryColor(config.primary_color);

    const pm = (config.payment_methods as Record<string, Record<string, unknown>>) ?? { cash: { enabled: true } };
    setPaymentMethods(pm);
    // Seleziona automaticamente il primo metodo abilitato
    const firstEnabled = Object.entries(pm).find(([, v]) => v.enabled)?.[0];
    if (firstEnabled) setPaymentMethod(firstEnabled);

    const estId = config.id;

    // Load ALL active maps
    const { data: mapsData } = await supabase
      .from("beach_maps")
      .select("id, name")
      .eq("establishment_id", estId)
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
      .eq("establishment_id", estId)
      .eq("is_active", true)
      .order("sort_order");

    if (servicesData) setServices(servicesData);

    // Load seasons and pricing rules
    const { data: seasonsData } = await supabase
      .from("seasons")
      .select("id, season_type, start_date, end_date")
      .eq("establishment_id", estId);
    if (seasonsData) setSeasons(seasonsData);

    const { data: rulesData } = await supabase
      .from("pricing_rules")
      .select("row_number, season_id, duration_type, price_cents")
      .eq("establishment_id", estId);
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
    durationType === "half_day"
      ? 1
      : startDate && endDate
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
    if (pricingRules.length === 0) {
      const base = FALLBACK_PRICES[rowNumber] || 15;
      return durationType === "half_day" ? Math.round(base * 0.6) : base;
    }

    const bookingDate = startDate || new Date().toISOString().split("T")[0];
    const currentSeason = seasons.find(
      (s) => bookingDate >= s.start_date && bookingDate <= s.end_date
    );

    // Try to find a rule matching current durationType first, then fallback to full_day
    const dTypes = durationType === "half_day" ? ["half_day", "full_day"] : ["full_day"];

    for (const dType of dTypes) {
      if (currentSeason) {
        const rule = pricingRules.find(
          (r) => r.row_number === rowNumber && r.season_id === currentSeason.id && r.duration_type === dType && r.element_type === elementType
        );
        if (rule) {
          const price = rule.price_cents / 100;
          return durationType === "half_day" && dType === "full_day" ? Math.round(price * 0.6) : price;
        }
        const fallbackRule = pricingRules.find(
          (r) => r.row_number === rowNumber && r.season_id === currentSeason.id && r.duration_type === dType
        );
        if (fallbackRule) {
          const price = fallbackRule.price_cents / 100;
          return durationType === "half_day" && dType === "full_day" ? Math.round(price * 0.6) : price;
        }
      }
      const anyRule = pricingRules.find(
        (r) => r.row_number === rowNumber && r.duration_type === dType && r.element_type === elementType
      );
      if (anyRule) {
        const price = anyRule.price_cents / 100;
        return durationType === "half_day" && dType === "full_day" ? Math.round(price * 0.6) : price;
      }
      const anyRowRule = pricingRules.find(
        (r) => r.row_number === rowNumber && r.duration_type === dType
      );
      if (anyRowRule) {
        const price = anyRowRule.price_cents / 100;
        return durationType === "half_day" && dType === "full_day" ? Math.round(price * 0.6) : price;
      }
    }

    const base = FALLBACK_PRICES[rowNumber] || 15;
    return durationType === "half_day" ? Math.round(base * 0.6) : base;
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
    if (paymentMethod === "stripe" && !guestEmail) return;
    setSubmitting(true);

    // Build items and services payload
    const items = selectedItems.map((item) => ({
      map_element_id: item.id,
      sunbeds_count: item.sunbeds,
      price_cents: Math.round(getPrice(item.rowNumber, item.elementType) * days * 100),
    }));

    const bookingServices = services
      .filter((s) => (serviceQtys[s.id] || 0) > 0)
      .map((s) => ({
        service_id: s.id,
        quantity: serviceQtys[s.id],
        price_cents: s.price_cents * days,
      }));

    // Use server-side API route to bypass RLS (anonymous users)
    const res = await fetch("/api/bookings/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        establishment_id: establishmentId,
        guest_name: guestName,
        guest_email: guestEmail,
        guest_phone: guestPhone,
        start_date: startDate,
        end_date: durationType === "half_day" ? startDate : endDate,
        duration_type: durationType,
        half_period: durationType === "half_day" ? halfPeriod : undefined,
        payment_method: paymentMethod,
        total_cents: Math.round(total * 100),
        items,
        services: bookingServices,
      }),
    });

    const bookingData = await res.json();

    if (!res.ok || !bookingData.id) {
      alert("Errore nella prenotazione: " + (bookingData.error || "sconosciuto"));
      setSubmitting(false);
      return;
    }

    const bookingId = bookingData.id;
    const bookingCode = bookingData.booking_code;
    const qrToken = bookingData.qr_token;

    // PayPal — redirect al checkout PayPal del lido
    if (paymentMethod === "paypal") {
      const paypalEmail = paymentMethods.paypal?.email as string | undefined;
      if (!paypalEmail) {
        alert("Email PayPal del lido non configurata");
        setSubmitting(false);
        return;
      }
      const returnUrl = `${window.location.origin}/api/bookings/paypal-return?bookingId=${bookingId}&slug=${slug}&booking_code=${bookingCode}`;
      const cancelUrl = `${window.location.origin}/lido/${slug}/prenota`;
      const paypalUrl = `https://www.paypal.com/cgi-bin/webscr?cmd=_xclick&business=${encodeURIComponent(paypalEmail)}&amount=${total.toFixed(2)}&currency_code=EUR&item_name=${encodeURIComponent("Prenotazione " + bookingCode)}&no_note=1&no_shipping=1&return=${encodeURIComponent(returnUrl)}&cancel_return=${encodeURIComponent(cancelUrl)}`;
      window.location.href = paypalUrl;
      return;
    }

    // Stripe — checkout sul conto Connect del lido
    if (paymentMethod === "stripe") {
      const stripeRes = await fetch("/api/stripe/booking-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId, slug }),
      });
      const stripeData = await stripeRes.json();
      if (stripeData.url) {
        window.location.href = stripeData.url;
        return;
      }
      alert(stripeData.error ?? "Errore Stripe");
      setSubmitting(false);
      return;
    }

    // Handle redirect-based payments
    if (paymentMethod === "satispay") {
      const satRes = await fetch("/api/satispay/create-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId }),
      });
      const satData = await satRes.json();
      if (satData.redirect_url) {
        window.location.href = satData.redirect_url;
        return;
      }
      alert(satData.error ?? "Errore Satispay");
      setSubmitting(false);
      return;
    }

    if (paymentMethod === "revolut") {
      const revRes = await fetch("/api/revolut/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId }),
      });
      const revData = await revRes.json();
      if (revData.checkout_url) {
        window.location.href = revData.checkout_url;
        return;
      }
      alert(revData.error ?? "Errore Revolut");
      setSubmitting(false);
      return;
    }

    // Email conferma al cliente
    fetch("/api/email/booking-confirmation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bookingId }),
    }).catch(console.error);

    // Notifica al gestore
    fetch("/api/email/nuova-prenotazione", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bookingId }),
    }).catch(console.error);

    // Mostra schermata di conferma
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
            {["Date", "Mappa", "Servizi", "Pagamento"].map((s, i) => (
              <div key={s} className="flex items-center gap-2">
                <button
                  onClick={() => i + 1 < step && setStep(i + 1)}
                  className={`flex h-7 items-center gap-1.5 rounded-full px-3 text-xs font-medium transition-colors ${
                    i + 1 === step
                      ? "bg-brand-azure text-white"
                      : i + 1 < step
                        ? "bg-available/15 text-available cursor-pointer"
                        : "bg-muted text-muted-foreground"
                  }`}
                >
                  {i + 1 < step ? <Check className="h-3 w-3" /> : <span>{i + 1}</span>}
                  {s}
                </button>
                {i < 3 && <div className="h-px w-4 bg-border" />}
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
        <div className={`grid gap-6 ${step === 1 ? "" : "lg:grid-cols-[1fr_320px]"}`}>
          <div>
            {step === 1 && (
              <div className="flex flex-col items-center justify-center py-8">
                <Card className="w-full max-w-lg mx-auto shadow-lg">
                  <CardHeader className="text-center pb-2">
                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-cyan via-brand-azure to-brand-blue">
                      <Calendar className="h-8 w-8 text-white" />
                    </div>
                    <CardTitle className="text-2xl">Quando vuoi venire?</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">Scegli le date del tuo soggiorno</p>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Durata */}
                    <div>
                      <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">Durata</label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => setDurationType("full_day")}
                          className={`rounded-xl border-2 p-3 text-sm font-medium transition-all ${durationType === "full_day" ? "border-brand-azure bg-brand-azure/10 text-brand-azure" : "border-border hover:border-brand-azure/40"}`}
                        >
                          ☀️ Giornata intera
                        </button>
                        <button
                          onClick={() => { setDurationType("half_day"); if (startDate) setEndDate(startDate); }}
                          className={`rounded-xl border-2 p-3 text-sm font-medium transition-all ${durationType === "half_day" ? "border-brand-azure bg-brand-azure/10 text-brand-azure" : "border-border hover:border-brand-azure/40"}`}
                        >
                          🌅 Mezza giornata
                        </button>
                      </div>
                    </div>

                    {/* Date */}
                    <div className={`grid gap-4 ${durationType === "full_day" ? "grid-cols-2" : "grid-cols-1"}`}>
                      <div>
                        <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          {durationType === "half_day" ? "Data" : "Arrivo"}
                        </label>
                        <div className="relative">
                          <Calendar className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                          <Input
                            type="date"
                            value={startDate}
                            onChange={(e) => {
                              setStartDate(e.target.value);
                              if (durationType === "half_day") setEndDate(e.target.value);
                            }}
                            min={new Date().toISOString().split("T")[0]}
                            className="h-12 pl-9 text-base"
                          />
                        </div>
                      </div>
                      {durationType === "full_day" && (
                        <div>
                          <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            Partenza
                          </label>
                          <div className="relative">
                            <Calendar className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                              type="date"
                              value={endDate}
                              onChange={(e) => setEndDate(e.target.value)}
                              min={startDate || new Date().toISOString().split("T")[0]}
                              className="h-12 pl-9 text-base"
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Periodo mezza giornata */}
                    {durationType === "half_day" && (
                      <div>
                        <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">Periodo</label>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            onClick={() => setHalfPeriod("morning")}
                            className={`rounded-xl border-2 p-3 text-sm font-medium transition-all ${halfPeriod === "morning" ? "border-brand-azure bg-brand-azure/10 text-brand-azure" : "border-border hover:border-brand-azure/40"}`}
                          >
                            🌅 Mattina
                          </button>
                          <button
                            onClick={() => setHalfPeriod("afternoon")}
                            className={`rounded-xl border-2 p-3 text-sm font-medium transition-all ${halfPeriod === "afternoon" ? "border-brand-azure bg-brand-azure/10 text-brand-azure" : "border-border hover:border-brand-azure/40"}`}
                          >
                            🌇 Pomeriggio
                          </button>
                        </div>
                      </div>
                    )}

                    {startDate && (durationType === "half_day" || endDate) && (
                      <div className="rounded-xl border border-brand-azure/20 bg-brand-azure/10 px-4 py-3 text-center">
                        <p className="text-sm font-medium text-brand-azure">
                          {durationType === "half_day"
                            ? `Mezza giornata · ${halfPeriod === "morning" ? "Mattina" : "Pomeriggio"} · ${new Date(startDate + "T12:00:00").toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long" })}`
                            : `${days === 1 ? "1 giorno" : `${days} giorni`} · ${new Date(startDate + "T12:00:00").toLocaleDateString("it-IT", { weekday: "short", day: "numeric", month: "short" })} → ${new Date(endDate + "T12:00:00").toLocaleDateString("it-IT", { weekday: "short", day: "numeric", month: "short" })}`
                          }
                        </p>
                      </div>
                    )}

                    <Button
                      variant="brand"
                      size="xl"
                      className="mt-2 w-full"
                      disabled={!startDate || (durationType === "full_day" && !endDate)}
                      onClick={() => setStep(2)}
                    >
                      Scegli il tuo posto
                      <ArrowRight className="h-5 w-5" />
                    </Button>
                  </CardContent>
                </Card>
              </div>
            )}

            {step === 2 && (
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
                                          backgroundColor: primaryColor,
                                          color: "white",
                                          boxShadow: `0 0 0 3px ${primaryColor}40`,
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

            {step === 3 && (
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

            {step === 4 && (
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
                  {Object.keys(paymentMethods).length > 0 && (
                    <div>
                      <label className="mb-2 block text-sm font-medium">Metodo di pagamento</label>
                      <div className="grid gap-2">
                        {Boolean(paymentMethods.stripe?.enabled) && (
                          <button type="button" onClick={() => setPaymentMethod("stripe")}
                            className={`flex items-center gap-3 rounded-lg border-2 p-3 text-left text-sm transition-all ${paymentMethod === "stripe" ? "border-brand-azure bg-brand-azure/5" : "border-gray-200 hover:border-gray-300"}`}>
                            <CreditCard className={`h-5 w-5 ${paymentMethod === "stripe" ? "text-brand-azure" : "text-muted-foreground"}`} />
                            <div><p className="font-medium">Carta di credito / debito</p><p className="text-xs text-muted-foreground">Visa, Mastercard, Google Pay, Apple Pay</p></div>
                          </button>
                        )}
                        {Boolean(paymentMethods.paypal?.enabled) && (
                          <button type="button" onClick={() => setPaymentMethod("paypal")}
                            className={`flex items-center gap-3 rounded-lg border-2 p-3 text-left text-sm transition-all ${paymentMethod === "paypal" ? "border-[#0070ba] bg-[#0070ba]/5" : "border-gray-200 hover:border-gray-300"}`}>
                            <Wallet className={`h-5 w-5 ${paymentMethod === "paypal" ? "text-[#0070ba]" : "text-muted-foreground"}`} />
                            <div><p className="font-medium">PayPal</p><p className="text-xs text-muted-foreground">Paga con il tuo conto PayPal</p></div>
                          </button>
                        )}
                        {Boolean(paymentMethods.satispay?.enabled) && (
                          <button type="button" onClick={() => setPaymentMethod("satispay")}
                            className={`flex items-center gap-3 rounded-lg border-2 p-3 text-left text-sm transition-all ${paymentMethod === "satispay" ? "border-[#e30613] bg-[#e30613]/5" : "border-gray-200 hover:border-gray-300"}`}>
                            <span className={`flex h-5 w-5 items-center justify-center rounded-full text-xs font-black ${paymentMethod === "satispay" ? "bg-[#e30613] text-white" : "bg-gray-200 text-gray-600"}`}>S</span>
                            <div><p className="font-medium">Satispay</p><p className="text-xs text-muted-foreground">Verrai reindirizzato su Satispay</p></div>
                          </button>
                        )}
                        {Boolean(paymentMethods.revolut?.enabled) && (
                          <button type="button" onClick={() => setPaymentMethod("revolut")}
                            className={`flex items-center gap-3 rounded-lg border-2 p-3 text-left text-sm transition-all ${paymentMethod === "revolut" ? "border-black bg-black/5" : "border-gray-200 hover:border-gray-300"}`}>
                            <span className={`flex h-5 w-5 items-center justify-center rounded-full text-xs font-black ${paymentMethod === "revolut" ? "bg-black text-white" : "bg-gray-200 text-gray-600"}`}>R</span>
                            <div><p className="font-medium">RevolutPay</p><p className="text-xs text-muted-foreground">Verrai reindirizzato su Revolut</p></div>
                          </button>
                        )}
                        {Boolean(paymentMethods.bonifico?.enabled) && (
                          <button type="button" onClick={() => setPaymentMethod("bonifico")}
                            className={`flex items-center gap-3 rounded-lg border-2 p-3 text-left text-sm transition-all ${paymentMethod === "bonifico" ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:border-gray-300"}`}>
                            <Building className={`h-5 w-5 ${paymentMethod === "bonifico" ? "text-blue-600" : "text-muted-foreground"}`} />
                            <div><p className="font-medium">Bonifico bancario</p><p className="text-xs text-muted-foreground">IBAN: {String(paymentMethods.bonifico?.iban || "").slice(0, 12)}...</p></div>
                          </button>
                        )}
                        {Boolean(paymentMethods.cash?.enabled) && (
                          <button type="button" onClick={() => setPaymentMethod("cash")}
                            className={`flex items-center gap-3 rounded-lg border-2 p-3 text-left text-sm transition-all ${paymentMethod === "cash" ? "border-green-500 bg-green-50" : "border-gray-200 hover:border-gray-300"}`}>
                            <Banknote className={`h-5 w-5 ${paymentMethod === "cash" ? "text-green-600" : "text-muted-foreground"}`} />
                            <div><p className="font-medium">Paga in loco</p><p className="text-xs text-muted-foreground">Contanti o POS al check-in</p></div>
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Info pagamento selezionato */}
                  {paymentMethod === "satispay" && (
                    <div className="rounded-lg bg-[#e30613]/5 border border-[#e30613]/20 p-3 text-sm">
                      <p className="font-medium text-[#e30613]">Satispay</p>
                      <p className="text-muted-foreground mt-1">Cliccando &quot;Conferma&quot; sarai reindirizzato alla pagina di pagamento Satispay. Il tuo posto sarà confermato automaticamente.</p>
                    </div>
                  )}
                  {paymentMethod === "revolut" && (
                    <div className="rounded-lg bg-black/5 border border-black/10 p-3 text-sm">
                      <p className="font-medium">RevolutPay</p>
                      <p className="text-muted-foreground mt-1">Cliccando &quot;Conferma&quot; sarai reindirizzato alla pagina di pagamento Revolut. Il tuo posto sarà confermato automaticamente.</p>
                    </div>
                  )}
                  {paymentMethod === "bonifico" && Boolean(paymentMethods.bonifico?.iban) && (
                    <div className="rounded-lg bg-blue-50 border border-blue-100 p-3 text-sm space-y-1">
                      <p className="font-medium text-blue-700">Dati per il bonifico</p>
                      <p><span className="text-muted-foreground">IBAN:</span> <strong>{String(paymentMethods.bonifico?.iban ?? "")}</strong></p>
                      {Boolean(paymentMethods.bonifico?.intestatario) && <p><span className="text-muted-foreground">Intestato a:</span> <strong>{String(paymentMethods.bonifico?.intestatario ?? "")}</strong></p>}
                      <p className="text-xs text-muted-foreground">Causale: Prenotazione ombrellone + tuo nome</p>
                    </div>
                  )}

                  <Button
                    variant="brand"
                    size="xl"
                    className={`w-full ${paymentMethod === "cash" ? "!bg-green-600 hover:!bg-green-700" : ""}`}
                    disabled={submitting || !guestName || !startDate || !endDate || (paymentMethod === "stripe" && !guestEmail)}
                    onClick={handleBooking}
                  >
                    {submitting ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : paymentMethod === "cash" ? (
                      <><Banknote className="h-5 w-5" />Prenota — {total}&euro; (paghi al lido)</>
                    ) : paymentMethod === "paypal" ? (
                      <><Wallet className="h-5 w-5" />Paga con PayPal — {total}&euro;</>
                    ) : paymentMethod === "satispay" ? (
                      <><span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/20 text-xs font-black">S</span>Prenota con Satispay — {total}&euro;</>
                    ) : paymentMethod === "revolut" ? (
                      <><span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/20 text-xs font-black">R</span>Prenota con Revolut — {total}&euro;</>
                    ) : paymentMethod === "bonifico" ? (
                      <><Building className="h-5 w-5" />Prenota — paga con bonifico</>
                    ) : (
                      <><CreditCard className="h-5 w-5" />Prenota e paga — {total}&euro;</>
                    )}
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar carrello */}
          {step > 1 && <div className="lg:sticky lg:top-20">
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
                  {step >= 2 && step < 4 && (
                    <Button
                      variant="brand"
                      className="w-full"
                      disabled={step === 2 && selectedItems.length === 0}
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
          </div>}
        </div>
      </div>
    </div>
  );
}

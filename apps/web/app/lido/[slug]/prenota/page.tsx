"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import {
  Umbrella, ArrowLeft, ArrowRight, Plus, Minus, ShoppingCart,
  Calendar, CreditCard, Check, Loader2, Home, Tent, BedSingle,
  Wallet, Banknote, Waves,
} from "lucide-react";
import QRCode from "qrcode";
import { createClient } from "@/lib/supabase/client";
import { generateBookingCode } from "@/lib/utils";

// ─── Tipi ────────────────────────────────────────────────────────────────────

interface Establishment {
  id: string;
  name: string;
  slug: string;
  logo_url?: string;
  primary_color: string;
  secondary_color: string;
  paypal_enabled?: boolean;
}

interface MapRow {
  id: string;
  label: string;
  row_number: number;
  beach_map_id?: string;
  mapName?: string;
  elements: MapElement[];
}

interface MapElement {
  id: string;
  row_id: string;
  element_type: string;
  label: string;
  max_sunbeds: number;
  is_premium: boolean;
}

interface Service {
  id: string;
  name: string;
  description?: string;
  price: number;
  is_daily: boolean;
}

interface SelectedItem {
  id: string;
  label: string;
  elementType: string;
  rowLabel: string;
  rowId: string;
  rowNumber: number;
  sunbeds: number;
  maxSunbeds: number;
}

interface PricingRule {
  row_id: string;
  season_id: string;
  duration: string;
  base_price: number;
}

interface Season {
  id: string;
  start_date: string;
  end_date: string;
}

const ELEMENT_ICONS: Record<string, typeof Umbrella> = {
  umbrella: Umbrella, cabana: Home, gazebo: Tent, sunbed: BedSingle,
};
const ELEMENT_LABELS: Record<string, string> = {
  umbrella: "Ombrellone", cabana: "Cabana", gazebo: "Gazebo", sunbed: "Lettino",
};
const ELEMENT_CAP_LABELS: Record<string, string> = {
  umbrella: "lettini", cabana: "persone", gazebo: "persone", sunbed: "posti",
};

// ─── Componente principale ───────────────────────────────────────────────────

export default function BookingPage() {
  const params = useParams();
  const slug = params.slug as string;
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [est, setEst] = useState<Establishment | null>(null);
  const [rows, setRows] = useState<MapRow[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [occupiedIds, setOccupiedIds] = useState<Set<string>>(new Set());
  const [pricingRules, setPricingRules] = useState<PricingRule[]>([]);
  const [seasons, setSeasons] = useState<Season[]>([]);

  const [step, setStep] = useState(1);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([]);
  const [serviceQtys, setServiceQtys] = useState<Record<string, number>>({});
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"stripe" | "paypal" | "onsite">("onsite");
  const [bookingConfirmed, setBookingConfirmed] = useState<{ code: string; total: number; qrToken: string } | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState("");

  useEffect(() => { loadData(); }, [slug]); // eslint-disable-line
  useEffect(() => {
    if (est?.id && startDate && endDate) loadAvailability();
  }, [startDate, endDate, est?.id]); // eslint-disable-line

  async function loadData() {
    const supabase = createClient();
    const { data: estData } = await supabase
      .from("establishments")
      .select("id, name, slug, logo_url, primary_color, secondary_color, paypal_enabled")
      .eq("slug", slug).eq("is_active", true).single();
    if (!estData) return;
    setEst({
      ...estData,
      primary_color: estData.primary_color || "#00BFFF",
      secondary_color: estData.secondary_color || "#0B1829",
    });

    // Mappe → file → elementi
    const { data: mapsData } = await supabase
      .from("beach_maps").select("id, name")
      .eq("establishment_id", estData.id).eq("is_active", true).order("created_at");

    if (mapsData?.length) {
      const mapIds = mapsData.map((m) => m.id);
      const { data: mapRows } = await supabase
        .from("map_rows").select("id, label, row_number, beach_map_id")
        .in("beach_map_id", mapIds).order("row_number");

      if (mapRows) {
        const rowIds = mapRows.map((r) => r.id);
        const { data: elData } = await supabase
          .from("map_elements")
          .select("id, row_id, element_type, label, max_sunbeds, is_premium")
          .in("row_id", rowIds).eq("is_bookable", true).order("x");

        setRows(mapRows.map((r) => ({
          ...r,
          mapName: mapsData.find((m) => m.id === r.beach_map_id)?.name || "",
          elements: (elData || []).filter((e) => e.row_id === r.id),
        })));
      }
    }

    // Servizi extra
    const { data: svcData } = await supabase
      .from("additional_services")
      .select("id, name, description, price, is_daily")
      .eq("establishment_id", estData.id).eq("is_active", true).order("sort_order");
    if (svcData) setServices(svcData);

    // Stagioni e tariffe
    const { data: seasonsData } = await supabase
      .from("seasons").select("id, start_date, end_date")
      .eq("establishment_id", estData.id);
    if (seasonsData) setSeasons(seasonsData);

    const { data: rulesData } = await supabase
      .from("pricing_rules").select("row_id, season_id, duration, base_price")
      .eq("establishment_id", estData.id).eq("duration", "full_day");
    if (rulesData) setPricingRules(rulesData as PricingRule[]);

    setLoading(false);
  }

  async function loadAvailability() {
    if (!est) return;
    const supabase = createClient();
    const { data: bookings } = await supabase
      .from("bookings")
      .select("id")
      .eq("establishment_id", est.id)
      .lte("start_date", endDate).gte("end_date", startDate)
      .in("status", ["confirmed", "checked_in", "pending"]);

    const occupied = new Set<string>();
    if (bookings?.length) {
      const { data: items } = await supabase
        .from("booking_items").select("map_element_id")
        .in("booking_id", bookings.map((b) => b.id));
      items?.forEach((i) => occupied.add(i.map_element_id));
    }
    setOccupiedIds(occupied);
    setSelectedItems((prev) => prev.filter((item) => !occupied.has(item.id)));
  }

  function toggleElement(element: MapElement, row: MapRow) {
    setSelectedItems((prev) => {
      if (prev.find((i) => i.id === element.id)) return prev.filter((i) => i.id !== element.id);
      return [...prev, {
        id: element.id, label: element.label,
        elementType: element.element_type || "umbrella",
        rowLabel: row.label, rowId: row.id, rowNumber: row.row_number,
        sunbeds: Math.min(2, element.max_sunbeds),
        maxSunbeds: element.max_sunbeds,
      }];
    });
  }

  function getPrice(rowId: string): number {
    const bookingDate = startDate || new Date().toISOString().split("T")[0];
    const season = seasons.find((s) => bookingDate >= s.start_date && bookingDate <= s.end_date);
    if (season) {
      const rule = pricingRules.find((r) => r.row_id === rowId && r.season_id === season.id);
      if (rule) return Number(rule.base_price);
    }
    const anyRule = pricingRules.find((r) => r.row_id === rowId);
    return anyRule ? Number(anyRule.base_price) : 0;
  }

  const days = startDate && endDate
    ? Math.max(1, Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / 86400000) + 1)
    : 1;

  const umbrellaTotal = selectedItems.reduce((sum, i) => sum + getPrice(i.rowId) * days, 0);
  const servicesTotal = services.reduce((sum, s) => sum + Number(s.price) * (serviceQtys[s.id] || 0) * (s.is_daily ? days : 1), 0);
  const total = umbrellaTotal + servicesTotal;

  async function handleBooking() {
    if (!est || !guestName || !startDate || !endDate || !selectedItems.length) return;
    setSubmitting(true);
    const supabase = createClient();
    const bookingCode = generateBookingCode();
    const qrToken = crypto.randomUUID();

    const { data: booking, error } = await supabase
      .from("bookings").insert({
        establishment_id: est.id,
        booking_code: bookingCode,
        guest_name: guestName,
        guest_email: guestEmail || null,
        guest_phone: guestPhone || null,
        start_date: startDate, end_date: endDate,
        duration: "full_day",
        status: paymentMethod === "onsite" ? "pending" : "confirmed",
        payment_method: paymentMethod,
        subtotal: total, total,
        qr_code_token: qrToken,
      }).select("id").single();

    if (error || !booking) {
      alert("Errore: " + (error?.message || "sconosciuto"));
      setSubmitting(false); return;
    }

    await supabase.from("booking_items").insert(
      selectedItems.map((item) => ({
        booking_id: booking.id,
        map_element_id: item.id,
        num_sunbeds: item.sunbeds,
        daily_price: getPrice(item.rowId),
      }))
    );

    const bookingServices = services
      .filter((s) => (serviceQtys[s.id] || 0) > 0)
      .map((s) => ({
        booking_id: booking.id, service_id: s.id,
        quantity: serviceQtys[s.id],
        unit_price: Number(s.price),
        total_price: Number(s.price) * serviceQtys[s.id] * (s.is_daily ? days : 1),
      }));
    if (bookingServices.length) await supabase.from("booking_services").insert(bookingServices);

    fetch("/api/email/booking-confirmation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bookingId: booking.id }),
    }).catch(() => {});

    const qrDataUrlGenerated = await QRCode.toDataURL(qrToken, { width: 250, margin: 2 });
    setQrDataUrl(qrDataUrlGenerated);
    setBookingConfirmed({ code: bookingCode, total, qrToken });
    setSubmitting(false);
  }

  const primary = est?.primary_color || "#00BFFF";
  const secondary = est?.secondary_color || "#0B1829";

  // ── Schermata conferma ──────────────────────────────────────────────────────
  if (bookingConfirmed) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-white px-4">
        <div className="w-full max-w-sm text-center">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
            <Check className="h-10 w-10 text-green-600" />
          </div>
          <h1 className="mb-2 text-2xl font-bold text-gray-900">Prenotazione confermata!</h1>
          <p className="mb-6 text-gray-500">Mostra questo QR code all&apos;arrivo per il check-in.</p>
          {qrDataUrl && (
            <div className="mx-auto mb-6 inline-block rounded-2xl border-4 bg-white p-3" style={{ borderColor: primary }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qrDataUrl} alt="QR check-in" width={200} height={200} className="block" />
            </div>
          )}
          <div className="mb-6 rounded-2xl border border-gray-100 bg-gray-50 p-5 text-left space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Codice prenotazione</span>
              <span className="font-mono font-bold" style={{ color: primary }}>{bookingConfirmed.code}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Totale</span>
              <span className="text-xl font-bold text-gray-900">{bookingConfirmed.total.toFixed(2)}€</span>
            </div>
          </div>
          <button
            onClick={() => router.push(`/lido/${slug}`)}
            className="w-full rounded-xl py-3.5 font-semibold text-white transition hover:opacity-90"
            style={{ backgroundColor: secondary }}
          >
            Torna alla pagina del lido
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: primary }} />
      </div>
    );
  }

  // ── Pagina principale ───────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50">

      {/* Header */}
      <header className="sticky top-0 z-40 bg-white border-b shadow-sm">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">

          <div className="flex items-center gap-3">
            <Link href={`/lido/${slug}`} className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-gray-100 text-gray-600">
              <ArrowLeft className="h-4 w-4" />
            </Link>
            {est?.logo_url ? (
              <Image src={est.logo_url} alt={est?.name || ""} width={28} height={28} className="h-7 w-7 rounded-full object-cover" />
            ) : (
              <div className="flex h-7 w-7 items-center justify-center rounded-full text-white text-xs font-bold" style={{ backgroundColor: secondary }}>
                {est?.name?.charAt(0)}
              </div>
            )}
            <span className="font-semibold text-gray-900 text-sm hidden sm:block">
              Prenota — {est?.name}
            </span>
          </div>

          {/* Steps */}
          <div className="hidden items-center gap-2 sm:flex">
            {["Mappa", "Servizi", "Pagamento"].map((label, i) => (
              <div key={label} className="flex items-center gap-2">
                <button
                  onClick={() => i + 1 <= step && setStep(i + 1)}
                  className="flex h-7 items-center gap-1.5 rounded-full px-3 text-xs font-medium transition-colors"
                  style={i + 1 === step
                    ? { backgroundColor: primary, color: "white" }
                    : i + 1 < step
                      ? { backgroundColor: "#dcfce7", color: "#16a34a" }
                      : { backgroundColor: "#f3f4f6", color: "#9ca3af" }
                  }
                >
                  {i + 1 < step ? <Check className="h-3 w-3" /> : <span>{i + 1}</span>}
                  {label}
                </button>
                {i < 2 && <div className="h-px w-4 bg-gray-200" />}
              </div>
            ))}
          </div>

          {/* Totale */}
          <div className="flex items-center gap-1.5 rounded-full border border-gray-200 bg-gray-50 px-3 py-1.5">
            <ShoppingCart className="h-4 w-4 text-gray-400" />
            <span className="text-sm font-semibold text-gray-800">{total.toFixed(2)}€</span>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">

        {/* Date picker */}
        <div className="mb-6 flex flex-wrap items-end gap-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              <Calendar className="mr-1 inline h-4 w-4" />
              Data arrivo
            </label>
            <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-44" />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Data partenza</label>
            <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} min={startDate} className="w-44" />
          </div>
          {days > 1 && (
            <span className="mb-1 rounded-full px-3 py-1 text-sm font-medium text-white" style={{ backgroundColor: primary }}>
              {days} giorni
            </span>
          )}
          {(!startDate || !endDate) && (
            <p className="mb-1 text-sm text-red-500">Seleziona le date per vedere la disponibilità.</p>
          )}
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_300px]">

          {/* ── Contenuto principale ── */}
          <div>

            {/* Step 1: Mappa */}
            {step === 1 && (
              <>
                {rows.length === 0 ? (
                  <div className="flex min-h-[200px] items-center justify-center rounded-2xl border border-gray-200 bg-white">
                    <p className="text-gray-400">La mappa non è ancora disponibile.</p>
                  </div>
                ) : (() => {
                    const zones = new Map<string, MapRow[]>();
                    rows.forEach((row) => {
                      const key = row.mapName || "Spiaggia";
                      if (!zones.has(key)) zones.set(key, []);
                      zones.get(key)!.push(row);
                    });
                    return Array.from(zones.entries()).map(([zoneName, zoneRows]) => (
                      <div key={zoneName} className="mb-4 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
                        {/* Mare header */}
                        <div className="flex items-center justify-center gap-2 py-2.5 text-sm font-semibold text-white" style={{ backgroundColor: primary }}>
                          <Waves className="h-4 w-4" />
                          {zoneName.toUpperCase()}
                          <Waves className="h-4 w-4" />
                        </div>
                        <div className="divide-y divide-gray-100 p-4 space-y-4">
                          {zoneRows.map((row) => {
                            const rowPrice = getPrice(row.id);
                            return (
                              <div key={row.id} className="pt-2 first:pt-0">
                                <div className="mb-2.5 flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <span className="flex h-6 w-6 items-center justify-center rounded-full text-white text-xs font-bold" style={{ backgroundColor: secondary }}>
                                      {row.row_number}
                                    </span>
                                    <span className="text-sm font-semibold text-gray-800">{row.label}</span>
                                  </div>
                                  {rowPrice > 0 && (
                                    <span className="text-sm font-medium text-gray-500">
                                      {rowPrice.toFixed(2)}€/giorno
                                    </span>
                                  )}
                                </div>
                                <div className="flex flex-wrap gap-2">
                                  {row.elements.map((el) => {
                                    const isOccupied = occupiedIds.has(el.id);
                                    const isSelected = selectedItems.some((i) => i.id === el.id);
                                    const ElIcon = ELEMENT_ICONS[el.element_type] || Umbrella;
                                    const isBig = el.element_type === "cabana" || el.element_type === "gazebo";
                                    return (
                                      <button
                                        key={el.id}
                                        disabled={isOccupied}
                                        onClick={() => toggleElement(el, row)}
                                        className={`flex ${isBig ? "h-14 w-20" : "h-12 w-12"} flex-col items-center justify-center gap-0.5 rounded-xl border-2 text-xs font-medium transition-all`}
                                        style={isOccupied
                                          ? { borderColor: "#fca5a5", backgroundColor: "#fef2f2", color: "#f87171", cursor: "not-allowed" }
                                          : isSelected
                                            ? { borderColor: primary, backgroundColor: primary + "20", color: primary, boxShadow: `0 0 0 2px ${primary}40` }
                                            : { borderColor: "#bbf7d0", backgroundColor: "#f0fdf4", color: "#16a34a" }
                                        }
                                      >
                                        <ElIcon className="h-4 w-4" />
                                        <span>{el.label}</span>
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ));
                  })()
                }

                {/* Legenda */}
                <div className="mt-3 flex flex-wrap gap-4 text-xs text-gray-500">
                  <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-full bg-green-300" />Disponibile</span>
                  <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-full bg-red-300" />Occupato</span>
                  <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-full" style={{ backgroundColor: primary }} />Selezionato</span>
                </div>

                {/* Dettaglio selezione lettini */}
                {selectedItems.length > 0 && (
                  <div className="mt-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                    <h3 className="mb-3 text-sm font-semibold text-gray-700">Numero lettini</h3>
                    <div className="space-y-2">
                      {selectedItems.map((item) => (
                        <div key={item.id} className="flex items-center justify-between rounded-xl bg-gray-50 px-3 py-2">
                          <span className="text-sm font-medium text-gray-800">
                            {ELEMENT_LABELS[item.elementType] || "Ombrellone"} {item.label}
                            <span className="ml-1.5 text-xs text-gray-400">{item.rowLabel}</span>
                          </span>
                          <div className="flex items-center gap-2">
                            <button onClick={() => setSelectedItems((p) => p.map((i) => i.id === item.id ? { ...i, sunbeds: Math.max(0, i.sunbeds - 1) } : i))}
                              className="flex h-7 w-7 items-center justify-center rounded-lg border bg-white hover:bg-gray-100">
                              <Minus className="h-3 w-3" />
                            </button>
                            <span className="w-6 text-center text-sm font-bold">{item.sunbeds}</span>
                            <button onClick={() => setSelectedItems((p) => p.map((i) => i.id === item.id ? { ...i, sunbeds: Math.min(i.maxSunbeds, i.sunbeds + 1) } : i))}
                              className="flex h-7 w-7 items-center justify-center rounded-lg border bg-white hover:bg-gray-100">
                              <Plus className="h-3 w-3" />
                            </button>
                            <span className="text-xs text-gray-400">{ELEMENT_CAP_LABELS[item.elementType] || "lettini"}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Step 2: Servizi */}
            {step === 2 && (
              <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
                <div className="border-b border-gray-100 px-5 py-4">
                  <h2 className="font-semibold text-gray-900">Servizi aggiuntivi</h2>
                  <p className="mt-0.5 text-sm text-gray-500">Opzionali — aggiungili alla tua prenotazione</p>
                </div>
                <div className="divide-y divide-gray-100 p-2">
                  {services.length === 0 ? (
                    <p className="px-4 py-8 text-center text-sm text-gray-400">Nessun servizio aggiuntivo disponibile.</p>
                  ) : services.map((service) => {
                    const qty = serviceQtys[service.id] || 0;
                    return (
                      <div key={service.id}
                        className="flex items-center justify-between rounded-xl p-4 transition"
                        style={qty > 0 ? { backgroundColor: primary + "0d", border: `1.5px solid ${primary}60` } : {}}
                      >
                        <div>
                          <p className="font-medium text-gray-800">{service.name}</p>
                          <p className="text-sm text-gray-400">
                            {Number(service.price).toFixed(2)}€{service.is_daily ? "/giorno" : ""}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button onClick={() => setServiceQtys((p) => { const n = Math.max(0, (p[service.id] || 0) - 1); const { [service.id]: _, ...rest } = p; return n === 0 ? rest : { ...p, [service.id]: n }; })}
                            disabled={qty === 0}
                            className="flex h-8 w-8 items-center justify-center rounded-lg border bg-white hover:bg-gray-50 disabled:opacity-30">
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="w-6 text-center font-bold text-gray-800">{qty}</span>
                          <button onClick={() => setServiceQtys((p) => ({ ...p, [service.id]: (p[service.id] || 0) + 1 }))}
                            className="flex h-8 w-8 items-center justify-center rounded-lg border bg-white hover:bg-gray-50">
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Step 3: Pagamento */}
            {step === 3 && (
              <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
                <div className="border-b border-gray-100 px-5 py-4">
                  <h2 className="font-semibold text-gray-900">Completa la prenotazione</h2>
                </div>
                <div className="space-y-4 p-5">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700">Nome e cognome *</label>
                    <Input placeholder="Mario Rossi" value={guestName} onChange={(e) => setGuestName(e.target.value)} />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700">Telefono *</label>
                    <Input type="tel" placeholder="+39 333 123 4567" value={guestPhone} onChange={(e) => setGuestPhone(e.target.value)} />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700">Email</label>
                    <Input type="email" placeholder="mario@email.it" value={guestEmail} onChange={(e) => setGuestEmail(e.target.value)} />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">Metodo di pagamento</label>
                    <div className="space-y-2">
                      {[
                        { key: "onsite", icon: Banknote, label: "Paga in loco", sub: "Contanti o POS al check-in", color: "#16a34a" },
                        { key: "stripe", icon: CreditCard, label: "Carta di credito/debito", sub: "Pagamento sicuro con Stripe", color: primary },
                        ...(est?.paypal_enabled ? [{ key: "paypal", icon: Wallet, label: "PayPal", sub: "Paga con il tuo conto PayPal", color: "#0070ba" }] : []),
                      ].map(({ key, icon: Icon, label, sub, color }) => (
                        <button key={key} type="button"
                          onClick={() => setPaymentMethod(key as typeof paymentMethod)}
                          className="flex w-full items-center gap-3 rounded-xl border-2 p-3 text-left text-sm transition"
                          style={paymentMethod === key ? { borderColor: color, backgroundColor: color + "08" } : { borderColor: "#e5e7eb" }}
                        >
                          <Icon className="h-5 w-5 shrink-0" style={{ color: paymentMethod === key ? color : "#9ca3af" }} />
                          <div>
                            <p className="font-medium text-gray-800">{label}</p>
                            <p className="text-xs text-gray-400">{sub}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    disabled={submitting || !guestName || !guestPhone || !startDate || !endDate || !selectedItems.length}
                    onClick={handleBooking}
                    className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-base font-semibold text-white transition hover:opacity-90 disabled:opacity-40"
                    style={{ backgroundColor: paymentMethod === "onsite" ? "#16a34a" : primary }}
                  >
                    {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : (
                      <>
                        {paymentMethod === "onsite" ? "Prenota — paghi al lido" : `Prenota e paga — ${total.toFixed(2)}€`}
                        <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ── Sidebar riepilogo ── */}
          <div className="lg:sticky lg:top-20 lg:self-start">
            <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
              <div className="px-4 py-3 text-white" style={{ backgroundColor: secondary }}>
                <div className="flex items-center gap-2">
                  <ShoppingCart className="h-4 w-4" />
                  <span className="font-semibold">Riepilogo</span>
                </div>
              </div>
              <div className="p-4 space-y-3">
                {selectedItems.length === 0 ? (
                  <p className="py-2 text-center text-sm text-gray-400">
                    Seleziona un ombrellone dalla mappa per iniziare.
                  </p>
                ) : (
                  <>
                    {startDate && endDate && (
                      <div className="flex items-center gap-1.5 rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-500">
                        <Calendar className="h-3.5 w-3.5" />
                        {startDate} → {endDate} · {days} {days === 1 ? "giorno" : "giorni"}
                      </div>
                    )}
                    {selectedItems.map((item) => (
                      <div key={item.id} className="flex items-center justify-between text-sm">
                        <span className="text-gray-700">
                          {ELEMENT_LABELS[item.elementType] || "Omb."} {item.label}
                          <span className="text-xs text-gray-400"> · {item.rowLabel}</span>
                        </span>
                        <span className="font-medium text-gray-900">{(getPrice(item.rowId) * days).toFixed(2)}€</span>
                      </div>
                    ))}
                    {services.filter((s) => (serviceQtys[s.id] || 0) > 0).map((s) => (
                      <div key={s.id} className="flex items-center justify-between text-sm">
                        <span className="text-gray-700">{s.name} ×{serviceQtys[s.id]}</span>
                        <span className="font-medium text-gray-900">
                          {(Number(s.price) * serviceQtys[s.id] * (s.is_daily ? days : 1)).toFixed(2)}€
                        </span>
                      </div>
                    ))}
                    <div className="border-t border-gray-100 pt-3 flex items-center justify-between">
                      <span className="font-semibold text-gray-900">Totale</span>
                      <span className="text-xl font-bold text-gray-900">{total.toFixed(2)}€</span>
                    </div>
                  </>
                )}

                <div className="space-y-2 pt-1">
                  {step < 3 && (
                    <button
                      disabled={selectedItems.length === 0 || !startDate || !endDate}
                      onClick={() => setStep(step + 1)}
                      className="flex w-full items-center justify-center gap-2 rounded-xl py-3 font-semibold text-white transition hover:opacity-90 disabled:opacity-40"
                      style={{ backgroundColor: primary }}
                    >
                      Continua
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  )}
                  {step > 1 && (
                    <button onClick={() => setStep(step - 1)}
                      className="flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 transition">
                      <ArrowLeft className="h-4 w-4" />
                      Indietro
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

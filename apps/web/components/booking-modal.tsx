"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  X,
  Umbrella,
  Home,
  Tent,
  BedSingle,
  ArrowRight,
  ArrowLeft,
  Loader2,
  Check,
  Calendar,
  Euro,
  User,
  Phone,
  Mail,
} from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────────

interface MapRow {
  id: string;
  label: string;
  row_number: number;
}

interface MapElement {
  id: string;
  map_row_id: string;
  element_type: string;
  label: string;
  position_x: number;
  max_sunbeds: number;
  is_premium: boolean;
  is_active: boolean;
  // enriched
  row_number?: number;
  price_cents?: number | null;
}

// ── Constants ──────────────────────────────────────────────────────────────

const ELEMENT_ICONS = {
  umbrella: Umbrella,
  cabana: Home,
  gazebo: Tent,
  sunbed: BedSingle,
} as const;

const ELEMENT_LABELS: Record<string, string> = {
  umbrella: "Ombrellone",
  cabana: "Cabana",
  gazebo: "Gazebo",
  sunbed: "Lettino",
};

// ── Props ──────────────────────────────────────────────────────────────────

interface BookingModalProps {
  establishmentId: string;
  /** When opened from mappa page with pre-selected element */
  initialElementId?: string | null;
  /** Date pre-selected on the map (passes through to step 1) */
  initialDate?: string;
  onClose: () => void;
  onSuccess: () => void;
}

// ── Component ──────────────────────────────────────────────────────────────

export function BookingModal({
  establishmentId,
  initialElementId,
  initialDate,
  onClose,
  onSuccess,
}: BookingModalProps) {
  const today = new Date().toISOString().slice(0, 10);
  const defaultDate = initialDate || today;

  const [step, setStep] = useState<1 | 2>(initialElementId ? 2 : 1);
  const [loading, setLoading] = useState(true);

  // Map data
  const [rows, setRows] = useState<MapRow[]>([]);
  const [elements, setElements] = useState<MapElement[]>([]);
  const [occupiedIds, setOccupiedIds] = useState<Set<string>>(new Set());

  // Date selection — inizializzate con la data della mappa se passata
  const [startDate, setStartDate] = useState(defaultDate);
  const [endDate, setEndDate] = useState(defaultDate);

  // Selected element
  const [selectedId, setSelectedId] = useState<string | null>(
    initialElementId || null
  );
  const [sunbedsCount, setSunbedsCount] = useState(2);

  // Customer form
  const [guestName, setGuestName] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [totalOverride, setTotalOverride] = useState("");

  // Saving
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  // ── Data loading ─────────────────────────────────────────────────────────

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [establishmentId]);

  useEffect(() => {
    if (startDate && endDate) loadAvailability();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startDate, endDate, establishmentId]);

  async function loadData() {
    const supabase = createClient();

    const { data: maps } = await supabase
      .from("beach_maps")
      .select("id")
      .eq("establishment_id", establishmentId)
      .eq("is_active", true)
      .limit(1);

    if (!maps?.length) {
      setLoading(false);
      return;
    }
    const mapId = maps[0].id;

    const { data: rowsData } = await supabase
      .from("map_rows")
      .select("id, label, row_number")
      .eq("beach_map_id", mapId)
      .order("row_number");

    setRows(rowsData || []);
    const rowIds = rowsData?.map((r) => r.id) || [];
    if (!rowIds.length) {
      setLoading(false);
      return;
    }

    const { data: elsData } = await supabase
      .from("map_elements")
      .select(
        "id, map_row_id, element_type, label, position_x, max_sunbeds, is_premium, is_active"
      )
      .in("map_row_id", rowIds)
      .eq("is_active", true)
      .order("position_x");

    // Load pricing rules (full_day)
    const { data: rulesData } = await supabase
      .from("pricing_rules")
      .select("row_number, price_cents, duration_type")
      .eq("establishment_id", establishmentId)
      .eq("duration_type", "full_day");

    // Enrich elements with row_number + price
    const rowMap = new Map(
      (rowsData || []).map((r) => [r.id, r.row_number])
    );
    const enriched = (elsData || []).map((el) => {
      const rowNum = rowMap.get(el.map_row_id) || 0;
      const rule = rulesData?.find((r) => r.row_number === rowNum);
      return {
        ...el,
        row_number: rowNum,
        price_cents: rule?.price_cents ?? null,
      };
    });

    setElements(enriched);
    setLoading(false);

    if (initialElementId) {
      const el = enriched.find((e) => e.id === initialElementId);
      if (el) setSunbedsCount(Math.min(2, el.max_sunbeds));
    }
  }

  async function loadAvailability() {
    const supabase = createClient();
    const { data: bookings } = await supabase
      .from("bookings")
      .select("id, booking_items(map_element_id)")
      .eq("establishment_id", establishmentId)
      .lte("start_date", endDate)
      .gte("end_date", startDate)
      .in("status", ["confirmed", "checked_in", "pending"]);

    const occupied = new Set<string>();
    bookings?.forEach((b) => {
      const items = b.booking_items as unknown as { map_element_id: string }[];
      items?.forEach((item) => occupied.add(item.map_element_id));
    });
    setOccupiedIds(occupied);
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  function getDays(): number {
    const start = new Date(startDate);
    const end = new Date(endDate);
    return Math.max(1, Math.round((end.getTime() - start.getTime()) / 86400000) + 1);
  }

  function getAutoTotal(): number {
    const el = elements.find((e) => e.id === selectedId);
    if (!el?.price_cents) return 0;
    return (el.price_cents * getDays()) / 100;
  }

  function getDisplayTotal(): number {
    if (totalOverride !== "") return parseFloat(totalOverride) || 0;
    return getAutoTotal();
  }

  function selectElement(el: MapElement) {
    if (occupiedIds.has(el.id)) return;
    setSelectedId(el.id);
    setSunbedsCount(Math.min(2, el.max_sunbeds));
    setTotalOverride("");
  }

  const selectedEl = elements.find((e) => e.id === selectedId);
  const selectedRow = rows.find((r) => r.id === selectedEl?.map_row_id);

  // ── Save ──────────────────────────────────────────────────────────────────

  async function handleSave() {
    if (!selectedId || !guestName || !guestPhone) return;
    setSaving(true);
    setSaveError("");

    try {
      const supabase = createClient();
      const code = `MAN-${Date.now().toString(36).toUpperCase()}`;
      const totalCents = Math.round(getDisplayTotal() * 100);

      const { data: booking, error } = await supabase
        .from("bookings")
        .insert({
          establishment_id: establishmentId,
          booking_code: code,
          guest_name: guestName,
          guest_phone: guestPhone,
          guest_email: guestEmail || null,
          start_date: startDate,
          end_date: endDate,
          status: "confirmed",
          total_cents: totalCents,
          notes: notes || null,
          payment_method: "onsite",
        })
        .select("id")
        .single();

      if (error || !booking) {
        setSaveError(error?.message || "Errore nella creazione.");
        setSaving(false);
        return;
      }

      await supabase.from("booking_items").insert({
        booking_id: booking.id,
        map_element_id: selectedId,
        sunbeds_count: sunbedsCount,
        price_cents: totalCents,
      });

      onSuccess();
    } catch {
      setSaveError("Errore imprevisto. Riprova.");
    } finally {
      setSaving(false);
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 py-8">
      <div className="w-full max-w-2xl rounded-xl bg-background shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b p-5">
          <div>
            <h2 className="text-lg font-bold">Nuova prenotazione manuale</h2>
            <p className="text-sm text-muted-foreground">
              {step === 1
                ? "Scegli il posto sulla mappa"
                : "Inserisci i dati del cliente"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1 hover:bg-muted"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-3 border-b px-5 py-3">
          {[
            { n: 1, label: "Mappa e date" },
            { n: 2, label: "Dati cliente" },
          ].map(({ n, label }) => (
            <div key={n} className="flex items-center gap-2">
              <div
                className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                  n < step
                    ? "bg-available text-white"
                    : n === step
                      ? "bg-brand-azure text-white"
                      : "bg-muted text-muted-foreground"
                }`}
              >
                {n < step ? <Check className="h-3 w-3" /> : n}
              </div>
              <span
                className={`text-sm ${n === step ? "font-medium" : "text-muted-foreground"}`}
              >
                {label}
              </span>
              {n < 2 && (
                <ArrowRight className="h-3 w-3 text-muted-foreground" />
              )}
            </div>
          ))}
        </div>

        <div className="p-5">
          {loading ? (
            <div className="flex min-h-[300px] items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-brand-azure" />
            </div>
          ) : step === 1 ? (
            /* ── STEP 1: Visual map ─────────────────────────────────────── */
            <div className="space-y-4">
              {/* Date range picker */}
              <div className="flex items-center gap-3 rounded-lg border bg-muted/30 p-3">
                <Calendar className="h-4 w-4 shrink-0 text-muted-foreground" />
                <div className="flex flex-1 flex-wrap items-end gap-2">
                  <div className="min-w-[120px] flex-1">
                    <label className="mb-0.5 block text-xs text-muted-foreground">
                      Dal
                    </label>
                    <Input
                      type="date"
                      value={startDate}
                      min={today}
                      onChange={(e) => {
                        setStartDate(e.target.value);
                        if (e.target.value > endDate)
                          setEndDate(e.target.value);
                      }}
                      className="h-8 text-sm"
                    />
                  </div>
                  <span className="pb-1 text-muted-foreground">→</span>
                  <div className="min-w-[120px] flex-1">
                    <label className="mb-0.5 block text-xs text-muted-foreground">
                      Al
                    </label>
                    <Input
                      type="date"
                      value={endDate}
                      min={startDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="h-8 text-sm"
                    />
                  </div>
                  <span className="rounded-md bg-brand-azure/10 px-2 py-1 text-xs font-medium text-brand-azure">
                    {getDays()} {getDays() === 1 ? "giorno" : "giorni"}
                  </span>
                </div>
              </div>

              {/* Legend */}
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <span className="h-3 w-3 rounded-sm border-2 border-available/60 bg-available/15" />
                  Disponibile (clicca per scegliere)
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-3 w-3 rounded-sm border-2 border-partial/60 bg-partial/15" />
                  Occupato
                </span>
              </div>

              {/* Map */}
              <div className="max-h-[45vh] overflow-auto rounded-lg border bg-gradient-to-b from-brand-cyan/5 to-transparent p-4">
                <div className="mb-4 rounded-lg bg-gradient-to-r from-brand-cyan/15 via-brand-azure/15 to-brand-blue/15 py-2 text-center text-xs font-medium text-brand-azure">
                  ▲ MARE
                </div>

                {rows.length === 0 ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">
                    Mappa vuota. Aggiungila prima nella sezione Mappa.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {rows.map((row) => {
                      const rowEls = elements
                        .filter((e) => e.map_row_id === row.id)
                        .sort((a, b) => a.position_x - b.position_x);
                      const freeCount = rowEls.filter(
                        (e) => !occupiedIds.has(e.id)
                      ).length;

                      return (
                        <div key={row.id}>
                          <div className="mb-1.5 flex items-center justify-between">
                            <span className="text-xs font-semibold text-muted-foreground">
                              {row.label}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {freeCount} liberi
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {rowEls.map((el) => {
                              const isOccupied = occupiedIds.has(el.id);
                              const isSelected = selectedId === el.id;
                              const isBig =
                                el.element_type === "cabana" ||
                                el.element_type === "gazebo";
                              const ElIcon =
                                ELEMENT_ICONS[
                                  el.element_type as keyof typeof ELEMENT_ICONS
                                ] || Umbrella;
                              const priceStr = el.price_cents
                                ? `€${(el.price_cents / 100).toFixed(0)}`
                                : null;

                              return (
                                <button
                                  key={el.id}
                                  onClick={() => !isOccupied && selectElement(el)}
                                  disabled={isOccupied}
                                  title={`${ELEMENT_LABELS[el.element_type] || el.element_type} ${el.label}${priceStr ? ` — ${priceStr}/giorno` : ""}`}
                                  className={`flex ${isBig ? "h-16 w-20" : "h-14 w-14"} flex-col items-center justify-center gap-0.5 rounded-lg border-2 text-xs font-medium transition-all ${
                                    isSelected
                                      ? "scale-110 border-brand-azure bg-brand-azure/15 text-brand-azure ring-2 ring-brand-azure/30"
                                      : isOccupied
                                        ? "cursor-not-allowed border-partial/40 bg-partial/10 text-partial/50 opacity-60"
                                        : "cursor-pointer border-available/50 bg-available/10 text-available hover:scale-105 hover:bg-available/20"
                                  }`}
                                >
                                  <ElIcon className="h-4 w-4" />
                                  <span>{el.label}</span>
                                  {priceStr && (
                                    <span
                                      className={`text-[10px] ${
                                        isSelected
                                          ? "text-brand-azure"
                                          : isOccupied
                                            ? "text-partial/40"
                                            : "text-available/80"
                                      }`}
                                    >
                                      {priceStr}
                                    </span>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Selected element summary */}
              {selectedEl ? (
                <div className="flex items-center justify-between rounded-lg border border-brand-azure/30 bg-brand-azure/5 p-3">
                  <div className="flex items-center gap-2">
                    {(() => {
                      const Ic =
                        ELEMENT_ICONS[
                          selectedEl.element_type as keyof typeof ELEMENT_ICONS
                        ] || Umbrella;
                      return <Ic className="h-5 w-5 text-brand-azure" />;
                    })()}
                    <div>
                      <p className="text-sm font-medium">
                        {ELEMENT_LABELS[selectedEl.element_type] || "Elemento"}{" "}
                        {selectedEl.label}
                        {selectedRow && (
                          <span className="ml-1.5 font-normal text-muted-foreground">
                            — {selectedRow.label}
                          </span>
                        )}
                      </p>
                      {selectedEl.price_cents && (
                        <p className="text-xs text-muted-foreground">
                          €{(selectedEl.price_cents / 100).toFixed(2)}/giorno ×{" "}
                          {getDays()} {getDays() === 1 ? "giorno" : "giorni"}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold text-brand-azure">
                      €{getAutoTotal().toFixed(2)}
                    </p>
                    <p className="text-xs text-muted-foreground">totale</p>
                  </div>
                </div>
              ) : (
                <p className="text-center text-sm text-muted-foreground">
                  Tocca un posto verde per selezionarlo.
                </p>
              )}

              <Button
                variant="brand"
                className="w-full"
                disabled={!selectedId}
                onClick={() => setStep(2)}
              >
                Continua — Dati cliente
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            /* ── STEP 2: Customer form ──────────────────────────────────── */
            <div className="space-y-4">
              {/* Compact summary of selected element + dates */}
              {selectedEl && (
                <div className="flex items-center justify-between rounded-lg bg-muted/50 p-3">
                  <div className="flex items-center gap-2">
                    {(() => {
                      const Ic =
                        ELEMENT_ICONS[
                          selectedEl.element_type as keyof typeof ELEMENT_ICONS
                        ] || Umbrella;
                      return <Ic className="h-4 w-4 text-muted-foreground" />;
                    })()}
                    <div>
                      <p className="text-sm font-medium">
                        {ELEMENT_LABELS[selectedEl.element_type] || "Elemento"}{" "}
                        {selectedEl.label}
                        {selectedRow && (
                          <span className="ml-1 text-xs text-muted-foreground">
                            — {selectedRow.label}
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {startDate === endDate
                          ? startDate
                          : `${startDate} → ${endDate}`}{" "}
                        ({getDays()} {getDays() === 1 ? "giorno" : "giorni"})
                      </p>
                    </div>
                  </div>
                  {!initialElementId && (
                    <button
                      onClick={() => setStep(1)}
                      className="text-xs text-brand-azure hover:underline"
                    >
                      Cambia
                    </button>
                  )}
                </div>
              )}

              {saveError && (
                <div className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {saveError}
                </div>
              )}

              {/* Form fields */}
              <div className="space-y-3">
                <div>
                  <label className="mb-1 flex items-center gap-1.5 text-sm font-medium">
                    <User className="h-3.5 w-3.5 text-muted-foreground" />
                    Nome e cognome *
                  </label>
                  <Input
                    placeholder="Mario Rossi"
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 flex items-center gap-1.5 text-sm font-medium">
                      <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                      Telefono *
                    </label>
                    <Input
                      placeholder="+39 333 1234567"
                      value={guestPhone}
                      onChange={(e) => setGuestPhone(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="mb-1 flex items-center gap-1.5 text-sm font-medium">
                      <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                      Email
                    </label>
                    <Input
                      type="email"
                      placeholder="mario@email.it"
                      value={guestEmail}
                      onChange={(e) => setGuestEmail(e.target.value)}
                    />
                  </div>
                </div>

                {/* Lettini count (only for elements with capacity > 1) */}
                {selectedEl && selectedEl.max_sunbeds > 1 && (
                  <div>
                    <label className="mb-1 block text-sm font-medium">
                      Numero lettini (max {selectedEl.max_sunbeds})
                    </label>
                    <select
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={sunbedsCount}
                      onChange={(e) =>
                        setSunbedsCount(parseInt(e.target.value))
                      }
                    >
                      {Array.from(
                        { length: selectedEl.max_sunbeds },
                        (_, i) => i + 1
                      ).map((n) => (
                        <option key={n} value={n}>
                          {n} lettino{n > 1 ? "i" : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="mb-1 flex items-center gap-1.5 text-sm font-medium">
                    <Euro className="h-3.5 w-3.5 text-muted-foreground" />
                    Importo totale (€)
                  </label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder={getAutoTotal().toFixed(2)}
                    value={totalOverride}
                    onChange={(e) => setTotalOverride(e.target.value)}
                  />
                  {getAutoTotal() > 0 && totalOverride === "" && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Calcolato: €{getAutoTotal().toFixed(2)} — modifica solo
                      se necessario
                    </p>
                  )}
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium">
                    Note interne
                  </label>
                  <Input
                    placeholder="Es. cliente abituale, richieste speciali..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>
              </div>

              {/* Preview summary */}
              <div className="rounded-lg border border-brand-azure/20 bg-brand-azure/5 p-4">
                <p className="mb-3 text-sm font-semibold text-brand-azure">
                  Anteprima prenotazione
                </p>
                <div className="space-y-1.5 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Posto</span>
                    <span className="font-medium">
                      {selectedEl
                        ? `${ELEMENT_LABELS[selectedEl.element_type] || "Elemento"} ${selectedEl.label}`
                        : "—"}
                      {selectedRow && (
                        <span className="font-normal text-muted-foreground">
                          {" "}
                          — {selectedRow.label}
                        </span>
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Date</span>
                    <span>
                      {startDate === endDate
                        ? startDate
                        : `${startDate} → ${endDate}`}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Giorni</span>
                    <span>{getDays()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Cliente</span>
                    <span className="font-medium">{guestName || "—"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Telefono</span>
                    <span>{guestPhone || "—"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Pagamento</span>
                    <span>In loco (contanti/pos)</span>
                  </div>
                  <div className="mt-2 flex justify-between border-t pt-2 text-base font-bold">
                    <span>Totale</span>
                    <span className="text-brand-azure">
                      €{getDisplayTotal().toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                {!initialElementId && (
                  <Button variant="outline" onClick={() => setStep(1)}>
                    <ArrowLeft className="h-4 w-4" />
                    Indietro
                  </Button>
                )}
                {initialElementId && (
                  <Button variant="outline" onClick={onClose}>
                    Annulla
                  </Button>
                )}
                <Button
                  variant="brand"
                  className="flex-1"
                  disabled={saving || !guestName || !guestPhone || !selectedId}
                  onClick={handleSave}
                >
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Check className="h-4 w-4" />
                      Crea prenotazione
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

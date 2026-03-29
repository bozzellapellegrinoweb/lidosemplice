"use client";

import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Search,
  Plus,
  QrCode,
  X,
  Calendar,
  Umbrella,
  Phone,
  Mail,
  Loader2,
  UserCheck,
  Package,
  Home,
  Tent,
  BedSingle,
  User,
  AlertCircle,
  Volume2,
  VolumeX,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { BookingModal } from "@/components/booking-modal";

// ── Audio ─────────────────────────────────────────────────────────────────────

let _audioCtx: AudioContext | null = null;

function getAudioCtx(): AudioContext {
  if (!_audioCtx) {
    _audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
  }
  return _audioCtx;
}

// Sblocca AudioContext al primo gesto utente (richiesto dalla autoplay policy del browser)
function unlockAudio() {
  try { getAudioCtx(); } catch {}
}

async function beepOnce() {
  try {
    const ctx = getAudioCtx();
    if (ctx.state === "suspended") await ctx.resume();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "sine";
    osc.frequency.setValueAtTime(660, ctx.currentTime);
    osc.frequency.setValueAtTime(880, ctx.currentTime + 0.15);
    osc.frequency.setValueAtTime(1100, ctx.currentTime + 0.3);
    gain.gain.setValueAtTime(0.5, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.7);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.7);
  } catch {}
}

function startAlertSound(): () => void {
  let stopped = false;
  beepOnce();
  const interval = setInterval(() => {
    if (!stopped) beepOnce();
  }, 2500);
  return () => { stopped = true; clearInterval(interval); };
}

// ─────────────────────────────────────────────────────────────────────────────

interface NewBookingAlert {
  guest_name: string;
  start_date: string;
  end_date: string;
  total_cents: number;
  booking_code: string;
}

const STATUS_MAP: Record<string, { label: string; variant: "available" | "partial" | "occupied" | "outline" }> = {
  confirmed: { label: "Confermato", variant: "partial" },
  checked_in: { label: "Check-in", variant: "available" },
  pending: { label: "In attesa", variant: "outline" },
  completed: { label: "Completato", variant: "outline" },
  cancelled: { label: "Cancellato", variant: "occupied" },
  no_show: { label: "No show", variant: "occupied" },
};

interface Booking {
  id: string;
  booking_code: string;
  guest_name: string;
  guest_email: string;
  guest_phone: string;
  start_date: string;
  end_date: string;
  status: string;
  total_cents: number;
  created_at: string;
  qr_code_token: string;
}

interface BookingItem {
  id: string;
  element_type: string;
  sunbeds_count: number;
  price_cents: number;
  element_label: string;
  row_label: string;
  zone_name: string;
}

interface BookingService {
  id: string;
  quantity: number;
  price_cents: number;
  service_name: string;
}

interface MapElement {
  id: string;
  label: string;
  element_type: string;
  map_row_id: string;
  row_label?: string;
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

export default function PrenotazioniPage() {
  const params = useParams();
  const slug = params.slug as string;

  const [establishmentId, setEstablishmentId] = useState<string>("");
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [selectedBooking, setSelectedBooking] = useState<string | null>(null);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [bookingItems, setBookingItems] = useState<BookingItem[]>([]);
  const [bookingServices, setBookingServices] = useState<BookingService[]>([]);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Modale nuova prenotazione
  const [showModal, setShowModal] = useState(false);
  const [soundOn, setSoundOn] = useState(true);
  const [bookingAlert, setBookingAlert] = useState<NewBookingAlert | null>(null);
  const stopSoundRef = useRef<(() => void) | null>(null);
  const lastBookingTimestampRef = useRef<string | null>(null);
  const establishmentIdRef = useRef<string | null>(null);

  useEffect(() => {
    loadBookings();
  }, [slug]);

  // Polling ogni 5s — fallback affidabile indipendente da Realtime
  useEffect(() => {
    if (!establishmentId) return;
    const interval = setInterval(() => pollNewBookings(), 5000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [establishmentId]);

  // Realtime subscription (bonus: istantaneo se abilitato in Supabase)
  useEffect(() => {
    if (!establishmentId) return;
    const supabase = createClient();
    const channel = supabase
      .channel("bookings-realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "bookings", filter: `establishment_id=eq.${establishmentId}` },
        (payload) => {
          loadBookings();
          const row = payload.new as { guest_name: string; start_date: string; end_date: string; total_cents: number; booking_code: string; created_at: string };
          lastBookingTimestampRef.current = row.created_at;
          triggerBookingAlert({ guest_name: row.guest_name || "Cliente", start_date: row.start_date, end_date: row.end_date, total_cents: row.total_cents, booking_code: row.booking_code });
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [establishmentId]);

  async function pollNewBookings() {
    const id = establishmentIdRef.current;
    if (!id) return;
    const supabase = createClient();
    const { data } = await supabase
      .from("bookings")
      .select("guest_name, start_date, end_date, total_cents, booking_code, created_at")
      .eq("establishment_id", id)
      .order("created_at", { ascending: false })
      .limit(1);

    if (data && data.length > 0) {
      const newest = data[0];
      if (lastBookingTimestampRef.current && new Date(newest.created_at) > new Date(lastBookingTimestampRef.current)) {
        loadBookings();
        triggerBookingAlert({ guest_name: newest.guest_name || "Cliente", start_date: newest.start_date, end_date: newest.end_date, total_cents: newest.total_cents, booking_code: newest.booking_code });
      }
      lastBookingTimestampRef.current = newest.created_at;
    }
  }

  function triggerBookingAlert(b: NewBookingAlert) {
    setBookingAlert(b);
    if (soundOn) {
      if (stopSoundRef.current) stopSoundRef.current();
      stopSoundRef.current = startAlertSound();
    }
  }

  async function loadBookings() {
    const supabase = createClient();
    const { data: est } = await supabase
      .from("establishments")
      .select("id")
      .eq("slug", slug)
      .single();

    if (!est) return;
    establishmentIdRef.current = est.id;
    setEstablishmentId(est.id);

    const { data } = await supabase
      .from("bookings")
      .select("*")
      .eq("establishment_id", est.id)
      .order("created_at", { ascending: false });

    if (data) {
      setBookings(data);
      // Inizializza timestamp: non triggerare alert per prenotazioni già esistenti
      if (data.length > 0 && lastBookingTimestampRef.current === null) {
        lastBookingTimestampRef.current = data[0].created_at;
      }
    }
    setLoading(false);
  }


  useEffect(() => {
    if (selectedBooking) {
      loadBookingDetail(selectedBooking);
    } else {
      setBookingItems([]);
      setBookingServices([]);
    }
  }, [selectedBooking]);

  async function loadBookingDetail(bookingId: string) {
    setLoadingDetail(true);
    const supabase = createClient();

    const { data: items } = await supabase
      .from("booking_items")
      .select("id, sunbeds_count, price_cents, map_element_id")
      .eq("booking_id", bookingId);

    if (items && items.length > 0) {
      const elementIds = items.map((i) => i.map_element_id);
      const { data: els } = await supabase
        .from("map_elements")
        .select("id, label, element_type, map_row_id")
        .in("id", elementIds);

      const rowIds = [...new Set(els?.map((e) => e.map_row_id) || [])];
      const { data: rows } = await supabase
        .from("map_rows")
        .select("id, label, beach_map_id")
        .in("id", rowIds);

      const mapIds = [...new Set(rows?.map((r) => r.beach_map_id) || [])];
      const { data: maps } = await supabase
        .from("beach_maps")
        .select("id, name")
        .in("id", mapIds);

      setBookingItems(items.map((item) => {
        const el = els?.find((e) => e.id === item.map_element_id);
        const row = rows?.find((r) => r.id === el?.map_row_id);
        const map = maps?.find((m) => m.id === row?.beach_map_id);
        return {
          id: item.id,
          element_type: el?.element_type || "umbrella",
          sunbeds_count: item.sunbeds_count,
          price_cents: item.price_cents,
          element_label: el?.label || "?",
          row_label: row?.label || "?",
          zone_name: map?.name || "Spiaggia",
        };
      }));
    } else {
      setBookingItems([]);
    }

    const { data: bServices } = await supabase
      .from("booking_services")
      .select("id, quantity, price_cents, additional_service_id")
      .eq("booking_id", bookingId);

    if (bServices && bServices.length > 0) {
      const serviceIds = bServices.map((s) => s.additional_service_id);
      const { data: services } = await supabase
        .from("additional_services")
        .select("id, name")
        .in("id", serviceIds);

      setBookingServices(bServices.map((bs) => ({
        id: bs.id,
        quantity: bs.quantity,
        price_cents: bs.price_cents,
        service_name: services?.find((s) => s.id === bs.additional_service_id)?.name || "Servizio",
      })));
    } else {
      setBookingServices([]);
    }

    setLoadingDetail(false);
  }

  async function updateStatus(bookingId: string, newStatus: string) {
    const supabase = createClient();
    await supabase.from("bookings").update({ status: newStatus }).eq("id", bookingId);
    setBookings(bookings.map((b) => b.id === bookingId ? { ...b, status: newStatus } : b));
  }

  const filtered = bookings.filter((b) => {
    const matchSearch =
      !search ||
      b.guest_name?.toLowerCase().includes(search.toLowerCase()) ||
      b.booking_code.toLowerCase().includes(search.toLowerCase()) ||
      b.guest_email?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = !statusFilter || b.status === statusFilter;
    const matchDateFrom = !dateFrom || b.end_date >= dateFrom;
    const matchDateTo = !dateTo || b.start_date <= dateTo;
    return matchSearch && matchStatus && matchDateFrom && matchDateTo;
  });

  const detail = selectedBooking ? bookings.find((b) => b.id === selectedBooking) : null;

  function dismissBookingAlert() {
    if (stopSoundRef.current) { stopSoundRef.current(); stopSoundRef.current = null; }
    setBookingAlert(null);
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-brand-azure" />
      </div>
    );
  }

  return (
    <>
      {/* ── Popup nuova prenotazione ──────────────────────────────────────── */}
      {bookingAlert && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-8 text-center shadow-2xl dark:bg-zinc-900">
            <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-brand-azure/15">
              <AlertCircle className="h-10 w-10 text-brand-azure animate-pulse" />
            </div>
            <h2 className="mb-1 text-2xl font-black tracking-tight">NUOVA PRENOTAZIONE!</h2>
            <div className="mb-6 space-y-2">
              <p className="text-xl font-bold">{bookingAlert.guest_name}</p>
              <div className="flex items-center justify-center gap-2 text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>{bookingAlert.start_date === bookingAlert.end_date ? bookingAlert.start_date : `${bookingAlert.start_date} → ${bookingAlert.end_date}`}</span>
              </div>
              <p className="font-mono text-sm text-muted-foreground">{bookingAlert.booking_code}</p>
              <p className="text-3xl font-black text-brand-azure">
                {(bookingAlert.total_cents / 100).toFixed(2)}&euro;
              </p>
            </div>
            <Button
              variant="brand"
              size="xl"
              className="w-full text-lg font-bold"
              onClick={dismissBookingAlert}
            >
              Ho visto!
            </Button>
          </div>
        </div>
      )}

    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Prenotazioni</h1>
          <p className="text-muted-foreground">{bookings.length} prenotazioni totali.</p>
        </div>
        <div className="flex gap-2">
          {/* Bottone suono: click sblocca AudioContext (autoplay policy browser) */}
          <Button
            variant={soundOn ? "default" : "outline"}
            onClick={() => { unlockAudio(); const next = !soundOn; setSoundOn(next); if (next) beepOnce(); }}
          >
            {soundOn ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
            Suono {soundOn ? "attivo" : "off"}
          </Button>
          <Button variant="outline">
            <QrCode className="h-4 w-4" />
            Scansiona QR
          </Button>
          <Button variant="brand" onClick={() => setShowModal(true)}>
            <Plus className="h-4 w-4" />
            Nuova prenotazione
          </Button>
        </div>
      </div>

      {/* Filtri */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Cerca per nome, codice o email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-40" />
            </div>
            <span className="text-muted-foreground">-</span>
            <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-40" min={dateFrom} />
            {(dateFrom || dateTo) && (
              <Button variant="ghost" size="sm" onClick={() => { setDateFrom(""); setDateTo(""); }}>
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {Object.entries(STATUS_MAP).map(([key, { label }]) => (
            <Button
              key={key}
              variant={statusFilter === key ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter(statusFilter === key ? null : key)}
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
                  className={`flex w-full items-center justify-between p-4 text-left transition-colors hover:bg-muted/50 ${selectedBooking === booking.id ? "bg-muted/50" : ""}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted font-mono text-xs font-medium">
                      {booking.booking_code.slice(-4)}
                    </div>
                    <div>
                      <p className="font-medium">{booking.guest_name}</p>
                      <p className="text-sm text-muted-foreground">
                        {booking.booking_code} &middot;{" "}
                        {booking.start_date === booking.end_date ? booking.start_date : `${booking.start_date} → ${booking.end_date}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant={STATUS_MAP[booking.status]?.variant || "outline"}>
                      {STATUS_MAP[booking.status]?.label || booking.status}
                    </Badge>
                    <span className="font-semibold">{(booking.total_cents / 100).toFixed(2)}&euro;</span>
                  </div>
                </button>
              ))}
              {filtered.length === 0 && (
                <div className="p-8 text-center text-muted-foreground">
                  {bookings.length === 0 ? "Nessuna prenotazione ancora." : "Nessuna prenotazione trovata con questi filtri."}
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
              <button onClick={() => setSelectedBooking(null)} className="rounded-md p-1 hover:bg-muted">
                <X className="h-4 w-4" />
              </button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-mono text-sm text-muted-foreground">{detail.booking_code}</span>
                <Badge variant={STATUS_MAP[detail.status]?.variant || "outline"}>
                  {STATUS_MAP[detail.status]?.label || detail.status}
                </Badge>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{detail.guest_name}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>{detail.start_date === detail.end_date ? detail.start_date : `${detail.start_date} → ${detail.end_date}`}</span>
                </div>
                {detail.guest_phone && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <a href={`tel:${detail.guest_phone}`} className="hover:underline">{detail.guest_phone}</a>
                  </div>
                )}
                {detail.guest_email && (
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span>{detail.guest_email}</span>
                  </div>
                )}
              </div>

              {loadingDetail ? (
                <div className="flex justify-center py-3">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <>
                  {bookingItems.length > 0 && (
                    <div className="space-y-2">
                      <p className="flex items-center gap-1.5 text-sm font-medium">
                        <Umbrella className="h-4 w-4 text-brand-azure" />
                        Elementi prenotati
                      </p>
                      {bookingItems.map((item) => {
                        const ItemIcon = ELEMENT_ICONS[item.element_type] || Umbrella;
                        return (
                          <div key={item.id} className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm">
                            <div className="flex items-start gap-2">
                              <ItemIcon className="mt-0.5 h-4 w-4 text-muted-foreground" />
                              <div>
                                <span className="font-medium">{ELEMENT_LABELS[item.element_type] || "Ombrellone"} {item.element_label}</span>
                                <span className="ml-1.5 text-muted-foreground">· {item.row_label}</span>
                                <p className="text-xs text-muted-foreground">{item.sunbeds_count} {ELEMENT_CAP_LABELS[item.element_type] || "lettini"}</p>
                              </div>
                            </div>
                            <span className="font-medium">{(item.price_cents / 100).toFixed(2)}&euro;</span>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {bookingServices.length > 0 && (
                    <div className="space-y-2">
                      <p className="flex items-center gap-1.5 text-sm font-medium">
                        <Package className="h-4 w-4 text-brand-azure" />
                        Servizi extra
                      </p>
                      {bookingServices.map((bs) => (
                        <div key={bs.id} className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm">
                          <span>{bs.service_name} ×{bs.quantity}</span>
                          <span className="font-medium">{(bs.price_cents / 100).toFixed(2)}&euro;</span>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}

              <div className="rounded-lg bg-muted p-3">
                <div className="flex items-center justify-between text-lg font-bold">
                  <span>Totale</span>
                  <span>{(detail.total_cents / 100).toFixed(2)}&euro;</span>
                </div>
              </div>

              <div className="space-y-2">
                {detail.status === "confirmed" && (
                  <Button variant="brand" className="w-full" onClick={() => updateStatus(detail.id, "checked_in")}>
                    <UserCheck className="h-4 w-4" />
                    Check-in
                  </Button>
                )}
                {detail.status === "pending" && (
                  <Button variant="brand" className="w-full" onClick={() => updateStatus(detail.id, "confirmed")}>
                    Conferma prenotazione
                  </Button>
                )}
                {detail.status === "checked_in" && (
                  <Button variant="outline" className="w-full" onClick={() => updateStatus(detail.id, "completed")}>
                    Segna completato
                  </Button>
                )}
                {(detail.status === "pending" || detail.status === "confirmed") && (
                  <Button variant="outline" className="w-full text-destructive" onClick={() => updateStatus(detail.id, "cancelled")}>
                    Cancella prenotazione
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="flex min-h-[300px] items-center justify-center p-6">
              <p className="text-center text-sm text-muted-foreground">Seleziona una prenotazione per vedere i dettagli.</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Modale nuova prenotazione */}
      {showModal && establishmentId && (
        <BookingModal
          establishmentId={establishmentId}
          onClose={() => setShowModal(false)}
          onSuccess={async () => {
            setShowModal(false);
            await loadBookings();
          }}
        />
      )}
    </div>
    </>
  );
}

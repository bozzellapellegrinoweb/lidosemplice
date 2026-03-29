"use client";

import { useState, useEffect } from "react";
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
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

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
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState("");
  const [elements, setElements] = useState<MapElement[]>([]);
  const [form, setForm] = useState({
    guest_name: "",
    guest_phone: "",
    guest_email: "",
    start_date: new Date().toISOString().slice(0, 10),
    end_date: new Date().toISOString().slice(0, 10),
    element_id: "",
    total: "",
    notes: "",
  });

  useEffect(() => {
    loadBookings();
  }, [slug]);

  async function loadBookings() {
    const supabase = createClient();
    const { data: est } = await supabase
      .from("establishments")
      .select("id")
      .eq("slug", slug)
      .single();

    if (!est) return;
    setEstablishmentId(est.id);

    const { data } = await supabase
      .from("bookings")
      .select("*")
      .eq("establishment_id", est.id)
      .order("created_at", { ascending: false });

    if (data) setBookings(data);
    setLoading(false);
  }

  async function loadElements() {
    if (!establishmentId) return;
    const supabase = createClient();
    const { data: maps } = await supabase
      .from("beach_maps")
      .select("id")
      .eq("establishment_id", establishmentId)
      .eq("is_active", true);

    if (!maps?.length) return;

    const { data: els } = await supabase
      .from("map_elements")
      .select("id, label, element_type, map_row_id")
      .in("beach_map_id", maps.map((m) => m.id))
      .eq("is_bookable", true)
      .order("label");

    if (!els) return;

    const rowIds = [...new Set(els.map((e) => e.map_row_id).filter(Boolean))];
    const { data: rows } = await supabase
      .from("map_rows")
      .select("id, label")
      .in("id", rowIds);

    const enriched = els.map((el) => ({
      ...el,
      row_label: rows?.find((r) => r.id === el.map_row_id)?.label || "",
    }));

    setElements(enriched);
  }

  function openModal() {
    setForm({
      guest_name: "",
      guest_phone: "",
      guest_email: "",
      start_date: new Date().toISOString().slice(0, 10),
      end_date: new Date().toISOString().slice(0, 10),
      element_id: "",
      total: "",
      notes: "",
    });
    setModalError("");
    loadElements();
    setShowModal(true);
  }

  async function handleCreateBooking() {
    if (!form.guest_name || !form.guest_phone || !form.start_date || !form.end_date || !form.element_id) {
      setModalError("Compila nome, telefono, date e ombrellone.");
      return;
    }
    setModalLoading(true);
    setModalError("");

    try {
      const supabase = createClient();
      const code = `MAN-${Date.now().toString(36).toUpperCase()}`;
      const totalCents = Math.round(parseFloat(form.total || "0") * 100);

      const { data: booking, error } = await supabase
        .from("bookings")
        .insert({
          establishment_id: establishmentId,
          booking_code: code,
          guest_name: form.guest_name,
          guest_phone: form.guest_phone,
          guest_email: form.guest_email || null,
          start_date: form.start_date,
          end_date: form.end_date,
          status: "confirmed",
          total_cents: totalCents,
          notes: form.notes || null,
          payment_method: "onsite",
        })
        .select("id")
        .single();

      if (error || !booking) {
        setModalError(error?.message || "Errore nella creazione.");
        setModalLoading(false);
        return;
      }

      // Crea booking item
      await supabase.from("booking_items").insert({
        booking_id: booking.id,
        map_element_id: form.element_id,
        sunbeds_count: 2,
        price_cents: totalCents,
      });

      setShowModal(false);
      await loadBookings();
    } catch {
      setModalError("Errore imprevisto. Riprova.");
    } finally {
      setModalLoading(false);
    }
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

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-brand-azure" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Prenotazioni</h1>
          <p className="text-muted-foreground">{bookings.length} prenotazioni totali.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <QrCode className="h-4 w-4" />
            Scansiona QR
          </Button>
          <Button variant="brand" onClick={openModal}>
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
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-background p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold">Nuova prenotazione manuale</h2>
              <button onClick={() => setShowModal(false)} className="rounded-md p-1 hover:bg-muted">
                <X className="h-5 w-5" />
              </button>
            </div>

            {modalError && (
              <div className="mb-4 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{modalError}</div>
            )}

            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-sm font-medium">Nome e cognome *</label>
                <Input
                  placeholder="Mario Rossi"
                  value={form.guest_name}
                  onChange={(e) => setForm({ ...form, guest_name: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-sm font-medium">Telefono *</label>
                  <Input
                    placeholder="+39 333 1234567"
                    value={form.guest_phone}
                    onChange={(e) => setForm({ ...form, guest_phone: e.target.value })}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">Email</label>
                  <Input
                    type="email"
                    placeholder="mario@email.it"
                    value={form.guest_email}
                    onChange={(e) => setForm({ ...form, guest_email: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-sm font-medium">Dal *</label>
                  <Input
                    type="date"
                    value={form.start_date}
                    onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">Al *</label>
                  <Input
                    type="date"
                    value={form.end_date}
                    min={form.start_date}
                    onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">Ombrellone / elemento *</label>
                <select
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={form.element_id}
                  onChange={(e) => setForm({ ...form, element_id: e.target.value })}
                >
                  <option value="">Seleziona...</option>
                  {elements.map((el) => (
                    <option key={el.id} value={el.id}>
                      {ELEMENT_LABELS[el.element_type] || el.element_type} {el.label}
                      {el.row_label ? ` — ${el.row_label}` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">Importo totale (€)</label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={form.total}
                  onChange={(e) => setForm({ ...form, total: e.target.value })}
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">Note</label>
                <Input
                  placeholder="Note interne..."
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                />
              </div>
            </div>

            <div className="mt-5 flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setShowModal(false)}>
                Annulla
              </Button>
              <Button variant="brand" className="flex-1" disabled={modalLoading} onClick={handleCreateBooking}>
                {modalLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Crea prenotazione"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

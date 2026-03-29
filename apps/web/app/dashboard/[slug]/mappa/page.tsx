"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Umbrella,
  Plus,
  Eye,
  Pencil,
  ZoomIn,
  ZoomOut,
  Users,
  Clock,
  QrCode,
  Loader2,
  Trash2,
  Waves,
  TreePalm,
  Droplets,
  UserCheck,
  Tent,
  Home,
  BedSingle,
  Save,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface BeachMap {
  id: string;
  name: string;
  establishment_id: string;
  is_active: boolean;
}

interface MapRow {
  id: string;
  label: string;
  row_number: number;
  beach_map_id: string;
}

interface MapElement {
  id: string;
  map_row_id: string;
  beach_map_id: string;
  element_type: string;
  label: string;
  position_x: number;
  position_y: number;
  max_sunbeds: number;
  is_premium: boolean;
  is_active: boolean;
}

interface BookingStatus {
  element_id: string;
  booking_id: string;
  status: "available" | "occupied" | "checked_in";
  client_name?: string;
}

const STATUS_COLORS: Record<string, string> = {
  available: "bg-available/15 border-available/40 text-available hover:bg-available/25",
  occupied: "bg-partial/15 border-partial/40 text-partial",
  checked_in: "bg-brand-azure/15 border-brand-azure/40 text-brand-azure",
};

const STATUS_LABELS: Record<string, string> = {
  available: "Libero",
  occupied: "Prenotato",
  checked_in: "Check-in",
};

const ZONE_ICONS: Record<string, typeof Waves> = {
  spiaggia: Waves,
  giardino: TreePalm,
  piscina: Droplets,
};

const ZONE_LABELS: Record<string, string> = {
  spiaggia: "Spiaggia",
  giardino: "Giardino",
  piscina: "Piscina",
};

const ZONE_HEADERS: Record<string, string> = {
  spiaggia: "MARE",
  giardino: "INGRESSO GIARDINO",
  piscina: "PISCINA",
};

const ELEMENT_TYPES = [
  { id: "umbrella", label: "Ombrellone", icon: Umbrella, defaultCapacity: 2, capacityLabel: "lettini" },
  { id: "cabana", label: "Cabana", icon: Home, defaultCapacity: 4, capacityLabel: "persone" },
  { id: "gazebo", label: "Gazebo", icon: Tent, defaultCapacity: 4, capacityLabel: "persone" },
  { id: "sunbed", label: "Lettino", icon: BedSingle, defaultCapacity: 1, capacityLabel: "posti" },
] as const;

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

const ELEMENT_CAPACITY_LABELS: Record<string, string> = {
  umbrella: "lettini",
  cabana: "persone",
  gazebo: "persone",
  sunbed: "posti",
};

export default function MappaPage() {
  const params = useParams();
  const slug = params.slug as string;

  const [mode, setMode] = useState<"view" | "edit">("view");
  const [loading, setLoading] = useState(true);
  const [zoom, setZoom] = useState(100);

  const [maps, setMaps] = useState<BeachMap[]>([]);
  const [activeMapId, setActiveMapId] = useState<string | null>(null);
  const [establishmentId, setEstablishmentId] = useState<string | null>(null);
  const [rows, setRows] = useState<MapRow[]>([]);
  const [elements, setElements] = useState<MapElement[]>([]);
  const [statuses, setStatuses] = useState<Map<string, BookingStatus>>(new Map());
  const [selectedElement, setSelectedElement] = useState<string | null>(null);

  // Edit mode state
  const [newRowLabel, setNewRowLabel] = useState("");
  const [showAddZone, setShowAddZone] = useState(false);
  const [newZoneName, setNewZoneName] = useState("");
  const [newZoneType, setNewZoneType] = useState("spiaggia");
  const [addElementType, setAddElementType] = useState("umbrella");
  const [hasChanges, setHasChanges] = useState(false);
  const [showUnsavedWarning, setShowUnsavedWarning] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);

  useEffect(() => {
    loadMaps();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  // When active map changes, reload rows/elements
  useEffect(() => {
    if (activeMapId) {
      loadMapData(activeMapId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeMapId]);

  // Reload statuses when date changes
  useEffect(() => {
    if (establishmentId) {
      loadStatuses(establishmentId, selectedDate);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate]);

  async function loadMaps() {
    const supabase = createClient();

    const { data: est } = await supabase
      .from("establishments")
      .select("id")
      .eq("slug", slug)
      .single();

    if (!est) return;
    setEstablishmentId(est.id);

    const { data: mapsData } = await supabase
      .from("beach_maps")
      .select("*")
      .eq("establishment_id", est.id)
      .eq("is_active", true)
      .order("created_at");

    if (mapsData && mapsData.length > 0) {
      setMaps(mapsData);
      setActiveMapId(mapsData[0].id);
    } else {
      // Create default "Spiaggia" map
      const { data: newMap } = await supabase
        .from("beach_maps")
        .insert({
          establishment_id: est.id,
          name: "Spiaggia",
          width: 100,
          height: 50,
          is_active: true,
        })
        .select()
        .single();

      if (newMap) {
        setMaps([newMap]);
        setActiveMapId(newMap.id);
      }
    }

    await loadStatuses(est.id, selectedDate);

    setLoading(false);
  }

  async function loadStatuses(estId: string, date: string) {
    const supabase = createClient();
    const { data: bookings } = await supabase
      .from("bookings")
      .select("id, status, guest_name, booking_items(map_element_id)")
      .eq("establishment_id", estId)
      .lte("start_date", date)
      .gte("end_date", date)
      .in("status", ["confirmed", "checked_in"]);

    const statusMap = new Map<string, BookingStatus>();
    bookings?.forEach((b) => {
      const items = b.booking_items as unknown as { map_element_id: string }[];
      items?.forEach((item) => {
        statusMap.set(item.map_element_id, {
          element_id: item.map_element_id,
          booking_id: b.id,
          status: b.status === "checked_in" ? "checked_in" : "occupied",
          client_name: b.guest_name || undefined,
        });
      });
    });
    setStatuses(statusMap);
  }

  async function loadMapData(mapId: string) {
    const supabase = createClient();

    const { data: rowsData } = await supabase
      .from("map_rows")
      .select("*")
      .eq("beach_map_id", mapId)
      .order("row_number");

    setRows(rowsData || []);

    const rowIds = rowsData?.map((r) => r.id) || [];
    if (rowIds.length > 0) {
      const { data: elementsData } = await supabase
        .from("map_elements")
        .select("*")
        .in("map_row_id", rowIds)
        .order("position_x");

      setElements(elementsData || []);
    } else {
      setElements([]);
    }

    setSelectedElement(null);
  }

  function getElementStatus(elementId: string): string {
    return statuses.get(elementId)?.status || "available";
  }

  function getElementClient(elementId: string): string | undefined {
    return statuses.get(elementId)?.client_name;
  }

  function getElementBookingId(elementId: string): string | undefined {
    return statuses.get(elementId)?.booking_id;
  }

  async function checkInElement(elementId: string) {
    const bookingId = getElementBookingId(elementId);
    if (!bookingId) return;

    const supabase = createClient();
    await supabase.from("bookings").update({ status: "checked_in" }).eq("id", bookingId);

    // Update local state
    setStatuses((prev) => {
      const next = new Map(prev);
      const existing = next.get(elementId);
      if (existing) {
        next.set(elementId, { ...existing, status: "checked_in" });
      }
      return next;
    });
  }

  // Get the zone type from map name
  function getZoneType(mapName: string): string {
    const lower = mapName.toLowerCase();
    if (lower.includes("piscina")) return "piscina";
    if (lower.includes("giardino")) return "giardino";
    return "spiaggia";
  }

  const rowLetters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

  function markChanged() {
    setHasChanges(true);
  }

  async function addZone() {
    if (!establishmentId || !newZoneName.trim()) return;
    const supabase = createClient();

    const { data: newMap } = await supabase
      .from("beach_maps")
      .insert({
        establishment_id: establishmentId,
        name: newZoneName.trim(),
        width: 100,
        height: 50,
        is_active: true,
      })
      .select()
      .single();

    if (newMap) {
      setMaps([...maps, newMap]);
      setActiveMapId(newMap.id);
      setShowAddZone(false);
      setNewZoneName("");
      setNewZoneType("spiaggia");
      markChanged();
    }
  }

  async function deleteZone(mapId: string) {
    if (maps.length <= 1) return; // Don't delete last zone
    const supabase = createClient();

    // Deactivate instead of hard delete
    await supabase.from("beach_maps").update({ is_active: false }).eq("id", mapId);

    const remaining = maps.filter((m) => m.id !== mapId);
    setMaps(remaining);
    if (activeMapId === mapId && remaining.length > 0) {
      setActiveMapId(remaining[0].id);
    }
    markChanged();
  }

  async function addRow() {
    if (!activeMapId) return;
    const supabase = createClient();

    // Calculate next row_number based on existing max, not array length
    const maxRowNumber = rows.length > 0 ? Math.max(...rows.map((r) => r.row_number)) : 0;
    const newNumber = maxRowNumber + 1;
    const letter = rowLetters[newNumber - 1] || `R${newNumber}`;
    const label = newRowLabel.trim() || `Fila ${newNumber}`;

    const { data: newRow, error } = await supabase
      .from("map_rows")
      .insert({
        beach_map_id: activeMapId,
        row_number: newNumber,
        label,
      })
      .select()
      .single();

    if (error) {
      console.error("Errore aggiunta fila:", error);
      return;
    }

    if (newRow) {
      setRows((prev) => [...prev, newRow]);

      // Create 10 default umbrellas
      const newElements = Array.from({ length: 10 }, (_, i) => ({
        beach_map_id: activeMapId,
        map_row_id: newRow.id,
        element_type: "umbrella" as const,
        label: `${letter}${i + 1}`,
        position_x: i,
        position_y: newNumber - 1,
        max_sunbeds: 2,
        is_bookable: true,
        is_premium: newNumber === 1,
        is_active: true,
      }));

      const { data: inserted, error: elError } = await supabase
        .from("map_elements")
        .insert(newElements)
        .select();

      if (elError) {
        console.error("Errore aggiunta ombrelloni:", elError);
      }

      if (inserted) {
        setElements((prev) => [...prev, ...inserted]);
      }
      markChanged();
    }
    setNewRowLabel("");
  }

  async function addElementToRow(rowId: string, rowNumber: number, elementType: string = "umbrella") {
    if (!activeMapId) return;
    const supabase = createClient();
    const letter = rowLetters[rowNumber - 1] || `R${rowNumber}`;
    const rowElements = elements.filter((e) => e.map_row_id === rowId);
    const nextNum = rowElements.length + 1;
    const typeInfo = ELEMENT_TYPES.find((t) => t.id === elementType) || ELEMENT_TYPES[0];

    const { data: newEl, error: elErr } = await supabase
      .from("map_elements")
      .insert({
        beach_map_id: activeMapId,
        map_row_id: rowId,
        element_type: elementType,
        label: `${letter}${nextNum}`,
        position_x: nextNum - 1,
        position_y: rowNumber - 1,
        max_sunbeds: typeInfo.defaultCapacity,
        is_premium: rowNumber === 1,
        is_active: true,
        is_bookable: true,
      })
      .select()
      .single();

    if (elErr) {
      console.error("Errore aggiunta elemento:", elErr, "tipo:", elementType);
      // Fallback: insert without element_type and then update
      const { data: fallbackEl } = await supabase
        .from("map_elements")
        .insert({
          beach_map_id: activeMapId,
          map_row_id: rowId,
          label: `${letter}${nextNum}`,
          position_x: nextNum - 1,
          position_y: rowNumber - 1,
          max_sunbeds: typeInfo.defaultCapacity,
          is_premium: rowNumber === 1,
          is_active: true,
          is_bookable: true,
        })
        .select()
        .single();

      if (fallbackEl && elementType !== "umbrella") {
        await supabase
          .from("map_elements")
          .update({ element_type: elementType as "umbrella" | "cabana" | "gazebo" | "sunbed" })
          .eq("id", fallbackEl.id);
        fallbackEl.element_type = elementType;
      }
      if (fallbackEl) {
        setElements((prev) => [...prev, fallbackEl]);
      }
      markChanged();
      return;
    }

    if (newEl) {
      setElements((prev) => [...prev, newEl]);
      markChanged();
    }
  }

  async function deleteElement(elementId: string) {
    const supabase = createClient();
    await supabase.from("map_elements").delete().eq("id", elementId);
    setElements((prev) => prev.filter((e) => e.id !== elementId));
    if (selectedElement === elementId) setSelectedElement(null);
    markChanged();
  }

  async function deleteRow(rowId: string) {
    const supabase = createClient();
    await supabase.from("map_elements").delete().eq("map_row_id", rowId);
    await supabase.from("map_rows").delete().eq("id", rowId);
    setElements((prev) => prev.filter((e) => e.map_row_id !== rowId));
    setRows((prev) => prev.filter((r) => r.id !== rowId));
    setSelectedElement(null);
    markChanged();
  }

  async function changeElementType(elementId: string, newType: string) {
    const supabase = createClient();
    const typeInfo = ELEMENT_TYPES.find((t) => t.id === newType) || ELEMENT_TYPES[0];
    const { error } = await supabase
      .from("map_elements")
      .update({
        element_type: newType as "umbrella" | "cabana" | "gazebo" | "sunbed",
        max_sunbeds: typeInfo.defaultCapacity,
      })
      .eq("id", elementId);

    if (!error) {
      setElements((prev) =>
        prev.map((e) =>
          e.id === elementId
            ? { ...e, element_type: newType, max_sunbeds: typeInfo.defaultCapacity }
            : e
        )
      );
      markChanged();
    } else {
      console.error("Errore cambio tipo:", error);
    }
  }

  const totalElements = elements.length;
  const occupiedCount = elements.filter(
    (e) => getElementStatus(e.id) !== "available"
  ).length;
  const occupancy = totalElements > 0 ? Math.round((occupiedCount / totalElements) * 100) : 0;

  const selected = selectedElement
    ? elements.find((e) => e.id === selectedElement)
    : null;

  const activeMap = maps.find((m) => m.id === activeMapId);
  const activeZoneType = activeMap ? getZoneType(activeMap.name) : "spiaggia";

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
          <h1 className="text-2xl font-bold">Mappa stabilimento</h1>
          <p className="text-muted-foreground">
            {mode === "view"
              ? `${selectedDate === new Date().toISOString().split("T")[0] ? "Oggi" : selectedDate} — ${occupiedCount}/${totalElements} occupati (${occupancy}%)`
              : "Modalita modifica — aggiungi file e ombrelloni"}
          </p>
        </div>
        <div className="flex gap-2">
          {mode === "edit" ? (
            <Button
              variant="brand"
              size="sm"
              onClick={() => {
                setMode("view");
                setHasChanges(false);
              }}
            >
              <Save className="h-4 w-4" />
              Salva e vedi
            </Button>
          ) : (
            <>
              <Button
                variant="default"
                size="sm"
                disabled
              >
                <Eye className="h-4 w-4" />
                Vista
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setMode("edit")}
              >
                <Pencil className="h-4 w-4" />
                Modifica
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Avviso modifiche non salvate */}
      {mode === "edit" && hasChanges && (
        <div className="flex items-center justify-between rounded-lg border-2 border-orange-300 bg-orange-50 p-3">
          <p className="text-sm font-medium text-orange-800">
            Hai modifiche non salvate. Clicca &quot;Salva e vedi&quot; per confermare.
          </p>
          <div className="flex gap-2">
            <Button
              variant="brand"
              size="sm"
              onClick={() => {
                setMode("view");
                setHasChanges(false);
              }}
            >
              <Save className="h-4 w-4" />
              Salva e vedi
            </Button>
          </div>
        </div>
      )}

      {/* Filtro data */}
      {mode === "view" && (
        <div className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-muted-foreground" />
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => {
              const d = new Date(selectedDate);
              d.setDate(d.getDate() - 1);
              setSelectedDate(d.toISOString().split("T")[0]);
            }}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Input
            type="date"
            className="h-9 w-auto text-sm"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
          />
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => {
              const d = new Date(selectedDate);
              d.setDate(d.getDate() + 1);
              setSelectedDate(d.toISOString().split("T")[0]);
            }}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          {selectedDate !== new Date().toISOString().split("T")[0] && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedDate(new Date().toISOString().split("T")[0])}
            >
              Oggi
            </Button>
          )}
        </div>
      )}

      {/* Zone tabs */}
      <div className="flex items-center gap-2 overflow-x-auto">
        {maps.map((m) => {
          const zoneType = getZoneType(m.name);
          const Icon = ZONE_ICONS[zoneType] || Waves;
          return (
            <Button
              key={m.id}
              variant={activeMapId === m.id ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveMapId(m.id)}
              className="shrink-0"
            >
              <Icon className="h-4 w-4" />
              {m.name}
            </Button>
          );
        })}
        {mode === "edit" && (
          <Button
            variant="ghost"
            size="sm"
            className="shrink-0 text-brand-azure"
            onClick={() => setShowAddZone(true)}
          >
            <Plus className="h-4 w-4" />
            Aggiungi zona
          </Button>
        )}
      </div>

      {/* Add zone form */}
      {showAddZone && (
        <Card className="border-brand-azure/30">
          <CardContent className="space-y-3 p-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <label className="mb-1 block text-sm font-medium">Tipo zona</label>
                <select
                  className="flex h-12 w-full rounded-lg border-2 border-input bg-background px-3 py-2 text-base"
                  value={newZoneType}
                  onChange={(e) => {
                    setNewZoneType(e.target.value);
                    if (!newZoneName) setNewZoneName(ZONE_LABELS[e.target.value] || "");
                  }}
                >
                  <option value="spiaggia">Spiaggia</option>
                  <option value="giardino">Giardino</option>
                  <option value="piscina">Piscina</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Nome</label>
                <Input
                  placeholder="es. Giardino retro"
                  value={newZoneName}
                  onChange={(e) => setNewZoneName(e.target.value)}
                />
              </div>
              <div className="flex items-end gap-2">
                <Button variant="brand" onClick={addZone}>
                  <Plus className="h-4 w-4" />
                  Crea zona
                </Button>
                <Button variant="outline" onClick={() => { setShowAddZone(false); setNewZoneName(""); }}>
                  Annulla
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Toolbar */}
      <div className="flex items-center justify-between rounded-lg border bg-card p-2">
        <div className="flex items-center gap-2">
          {mode === "edit" && (
            <div className="flex items-center gap-1">
              <Input
                placeholder="Nome fila..."
                className="h-9 w-40 text-sm"
                value={newRowLabel}
                onChange={(e) => setNewRowLabel(e.target.value)}
              />
              <Button variant="outline" size="sm" onClick={addRow}>
                <Plus className="h-4 w-4" />
                Aggiungi fila
              </Button>
              {maps.length > 1 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive"
                  onClick={() => activeMapId && deleteZone(activeMapId)}
                >
                  <Trash2 className="h-4 w-4" />
                  Elimina zona
                </Button>
              )}
            </div>
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
                Check-in
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
              {/* Zone header */}
              <div className="mb-4 flex h-14 items-center justify-center rounded-lg bg-gradient-to-r from-brand-cyan/15 via-brand-azure/15 to-brand-blue/15">
                <span className="text-sm font-medium text-brand-azure">
                  {ZONE_HEADERS[activeZoneType] || activeMap?.name?.toUpperCase()}
                </span>
              </div>

              {/* File */}
              {rows.length === 0 ? (
                <div className="flex min-h-[200px] flex-col items-center justify-center rounded-lg border-2 border-dashed">
                  <Umbrella className="mb-3 h-10 w-10 text-muted-foreground/30" />
                  <p className="text-muted-foreground">
                    {mode === "edit"
                      ? "Clicca \"Aggiungi fila\" per iniziare a costruire la mappa."
                      : "La mappa è vuota. Vai in modalità Modifica per aggiungere file."}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {rows.map((row) => {
                    const rowElements = elements
                      .filter((e) => e.map_row_id === row.id)
                      .sort((a, b) => a.position_x - b.position_x);

                    return (
                      <div key={row.id}>
                        <div className="mb-2 flex items-center justify-between">
                          <span className="text-sm font-medium text-muted-foreground">
                            {row.label}
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">
                              {rowElements.filter((e) => getElementStatus(e.id) === "available").length} liberi
                            </span>
                            {mode === "edit" && (
                              <>
                                <div className="flex items-center gap-1">
                                  <select
                                    className="h-7 rounded border bg-background px-1.5 text-xs"
                                    value={addElementType}
                                    onChange={(e) => setAddElementType(e.target.value)}
                                  >
                                    {ELEMENT_TYPES.map((t) => (
                                      <option key={t.id} value={t.id}>{t.label}</option>
                                    ))}
                                  </select>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 text-xs"
                                    onClick={() => addElementToRow(row.id, row.row_number, addElementType)}
                                  >
                                    <Plus className="h-3 w-3" />
                                    Aggiungi
                                  </Button>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-destructive"
                                  onClick={() => deleteRow(row.id)}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {rowElements.map((el) => {
                            const status = getElementStatus(el.id);
                            const ElIcon = ELEMENT_ICONS[el.element_type] || Umbrella;
                            const isBigElement = el.element_type === "cabana" || el.element_type === "gazebo";
                            return (
                              <button
                                key={el.id}
                                onClick={() => setSelectedElement(el.id)}
                                className={`flex ${isBigElement ? "h-14 w-20" : "h-14 w-14"} flex-col items-center justify-center rounded-lg border-2 text-xs font-medium transition-all ${
                                  STATUS_COLORS[status]
                                } ${selectedElement === el.id ? "ring-2 ring-foreground/20 scale-110" : ""}`}
                              >
                                <ElIcon className="h-4 w-4" />
                                <span className="mt-0.5">{el.label}</span>
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
          </CardContent>
        </Card>

        {/* Pannello dettaglio */}
        <div className="space-y-4">
          {selected ? (() => {
            const SelIcon = ELEMENT_ICONS[selected.element_type] || Umbrella;
            const selTypeLabel = ELEMENT_LABELS[selected.element_type] || "Elemento";
            const selCapLabel = ELEMENT_CAPACITY_LABELS[selected.element_type] || "posti";
            return (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <SelIcon className="h-5 w-5" />
                  {selTypeLabel} {selected.label}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Badge
                  variant={
                    getElementStatus(selected.id) === "available"
                      ? "available"
                      : getElementStatus(selected.id) === "checked_in"
                        ? "available"
                        : "partial"
                  }
                >
                  {STATUS_LABELS[getElementStatus(selected.id)]}
                </Badge>

                {getElementClient(selected.id) && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span>{getElementClient(selected.id)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span>08:00 - 19:00</span>
                    </div>
                  </div>
                )}

                {mode === "edit" && (
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">Tipo elemento</label>
                    <select
                      className="flex h-10 w-full rounded-lg border-2 border-input bg-background px-3 py-2 text-sm"
                      value={selected.element_type}
                      onChange={(e) => changeElementType(selected.id, e.target.value)}
                    >
                      {ELEMENT_TYPES.map((t) => (
                        <option key={t.id} value={t.id}>{t.label}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="text-sm text-muted-foreground">
                  <p>Capacità: {selected.max_sunbeds} {selCapLabel}</p>
                  {selected.is_premium && (
                    <Badge variant="partial" className="mt-1">Premium</Badge>
                  )}
                </div>

                <div className="space-y-2">
                  {getElementStatus(selected.id) === "available" ? (
                    <Button variant="brand" className="w-full">
                      <Plus className="h-4 w-4" />
                      Assegna rapido
                    </Button>
                  ) : getElementStatus(selected.id) === "occupied" ? (
                    <>
                      <Button
                        variant="brand"
                        className="w-full"
                        onClick={() => checkInElement(selected.id)}
                      >
                        <UserCheck className="h-4 w-4" />
                        Conferma in presenza
                      </Button>
                      <Button variant="outline" className="w-full">
                        <QrCode className="h-4 w-4" />
                        Check-in tramite QR
                      </Button>
                    </>
                  ) : null}
                  {mode === "edit" && (
                    <Button
                      variant="destructive"
                      className="w-full"
                      size="sm"
                      onClick={() => deleteElement(selected.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                      Elimina {selTypeLabel.toLowerCase()}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
            );
          })() : (
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

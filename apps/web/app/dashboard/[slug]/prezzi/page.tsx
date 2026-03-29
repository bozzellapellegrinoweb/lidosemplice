"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Euro, Plus, Save, Loader2, Check, Trash2, CalendarDays, Waves, TreePalm, Droplets, Umbrella, Tent, Maximize, BedDouble } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface Season {
  id: string;
  name: string;
  season_type: string;
  start_date: string;
  end_date: string;
}

interface PricingRule {
  id: string;
  season_id: string;
  row_id: string | null;
  row_number: number | null;
  element_type: string;
  duration: string;
  price_cents: number;
  weekend_markup_percent: number;
}

interface BeachMap {
  id: string;
  name: string;
}

interface ZoneRow {
  row_id: string;
  map_id: string;
  map_name: string;
  row_number: number;
  label: string;
  elementTypes: string[];
}

const SEASON_COLORS: Record<string, string> = {
  low: "bg-blue-100 text-blue-700",
  mid: "bg-green-100 text-green-700",
  high: "bg-orange-100 text-orange-700",
  peak: "bg-red-100 text-red-700",
};

const SEASON_LABELS: Record<string, string> = {
  low: "Bassa",
  mid: "Media",
  high: "Alta",
  peak: "Altissima",
};

const DURATION_LABELS: Record<string, string> = {
  half_day_morning: "Mezza giornata (mattino)",
  half_day_afternoon: "Mezza giornata (pomeriggio)",
  full_day: "Giornata intera",
  weekly: "Settimanale",
  biweekly: "Bisettimanale",
  monthly: "Mensile",
  seasonal: "Stagionale",
};

const ZONE_ICONS: Record<string, typeof Waves> = {
  spiaggia: Waves,
  giardino: TreePalm,
  piscina: Droplets,
};

const ELEMENT_TYPE_LABELS: Record<string, string> = {
  umbrella: "Ombrellone",
  cabana: "Cabana",
  gazebo: "Gazebo",
  sunbed: "Lettino",
};

const ELEMENT_TYPE_ICONS: Record<string, typeof Umbrella> = {
  umbrella: Umbrella,
  cabana: Tent,
  gazebo: Maximize,
  sunbed: BedDouble,
};

function getZoneType(name: string): string {
  const lower = name.toLowerCase();
  if (lower.includes("piscina")) return "piscina";
  if (lower.includes("giardino")) return "giardino";
  return "spiaggia";
}

export default function PrezziPage() {
  const params = useParams();
  const slug = params.slug as string;

  const [seasons, setSeasons] = useState<Season[]>([]);
  const [prices, setPrices] = useState<PricingRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [establishmentId, setEstablishmentId] = useState<string | null>(null);
  const [maps, setMaps] = useState<BeachMap[]>([]);
  const [zoneRows, setZoneRows] = useState<ZoneRow[]>([]);
  const [showAddSeason, setShowAddSeason] = useState(false);
  const [newSeason, setNewSeason] = useState({
    name: "",
    season_type: "mid",
    start_date: "",
    end_date: "",
  });

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  async function loadData() {
    const supabase = createClient();
    const { data: est } = await supabase
      .from("establishments")
      .select("id")
      .eq("slug", slug)
      .single();

    if (!est) return;
    setEstablishmentId(est.id);

    // Get ALL active maps
    const { data: mapsData } = await supabase
      .from("beach_maps")
      .select("id, name")
      .eq("establishment_id", est.id)
      .eq("is_active", true)
      .order("created_at");

    setMaps(mapsData || []);

    // Load seasons and prices
    const [seasonsRes, pricesRes] = await Promise.all([
      supabase
        .from("seasons")
        .select("*")
        .eq("establishment_id", est.id)
        .order("start_date"),
      supabase
        .from("pricing_rules")
        .select("*")
        .eq("establishment_id", est.id)
        .order("row_number"),
    ]);

    if (seasonsRes.data) setSeasons(seasonsRes.data);
    if (pricesRes.data) setPrices(pricesRes.data);

    // Load rows for ALL maps + distinct element types per row
    const allRows: ZoneRow[] = [];
    if (mapsData && mapsData.length > 0) {
      const mapIds = mapsData.map((m) => m.id);
      const { data: rowsData } = await supabase
        .from("map_rows")
        .select("id, row_number, label, beach_map_id")
        .in("beach_map_id", mapIds)
        .order("row_number");

      // Fetch element types per row
      const { data: elementsData } = await supabase
        .from("map_elements")
        .select("map_row_id, element_type")
        .in("beach_map_id", mapIds)
        .in("element_type", ["umbrella", "cabana", "gazebo", "sunbed"]);

      const typesByRow: Record<string, Set<string>> = {};
      if (elementsData) {
        for (const el of elementsData) {
          if (!typesByRow[el.map_row_id]) typesByRow[el.map_row_id] = new Set();
          typesByRow[el.map_row_id].add(el.element_type);
        }
      }

      if (rowsData) {
        for (const row of rowsData) {
          const map = mapsData.find((m) => m.id === row.beach_map_id);
          const types = typesByRow[row.id] ? Array.from(typesByRow[row.id]) : ["umbrella"];
          allRows.push({
            row_id: row.id,
            map_id: row.beach_map_id,
            map_name: map?.name || "Spiaggia",
            row_number: row.row_number,
            label: row.label,
            elementTypes: types,
          });
        }
      }
    }
    setZoneRows(allRows);
    setLoading(false);
  }

  async function addSeason() {
    if (!establishmentId || !newSeason.name || !newSeason.start_date || !newSeason.end_date)
      return;

    const supabase = createClient();
    const year = new Date(newSeason.start_date).getFullYear();
    const { data, error } = await supabase
      .from("seasons")
      .insert({
        establishment_id: establishmentId,
        name: newSeason.name,
        season_type: newSeason.season_type,
        start_date: newSeason.start_date,
        end_date: newSeason.end_date,
        year,
      })
      .select()
      .single();

    if (!error && data) {
      setSeasons([...seasons, data]);
      setNewSeason({ name: "", season_type: "mid", start_date: "", end_date: "" });
      setShowAddSeason(false);
    }
  }

  async function deleteSeason(id: string) {
    const supabase = createClient();
    await supabase.from("seasons").delete().eq("id", id);
    setSeasons(seasons.filter((s) => s.id !== id));
    setPrices(prices.filter((p) => p.season_id !== id));
  }

  function getPrice(seasonId: string, duration: string, rowId: string, elementType: string): string {
    const rule = prices.find(
      (p) => p.season_id === seasonId && p.duration === duration && p.row_id === rowId && p.element_type === elementType
    );
    return rule ? (rule.price_cents / 100).toFixed(0) : "";
  }

  function setPrice(seasonId: string, duration: string, rowId: string, rowNumber: number, elementType: string, value: string) {
    const cents = Math.round(parseFloat(value || "0") * 100);
    const existing = prices.find(
      (p) => p.season_id === seasonId && p.duration === duration && p.row_id === rowId && p.element_type === elementType
    );

    if (existing) {
      setPrices(
        prices.map((p) =>
          p.id === existing.id ? { ...p, price_cents: cents } : p
        )
      );
    } else {
      setPrices([
        ...prices,
        {
          id: `new-${Date.now()}-${Math.random()}`,
          season_id: seasonId,
          row_id: rowId,
          row_number: rowNumber,
          element_type: elementType,
          duration,
          price_cents: cents,
          weekend_markup_percent: 0,
        },
      ]);
    }
    setSaved(false);
  }

  async function savePrices() {
    if (!establishmentId) return;
    setSaving(true);

    const supabase = createClient();

    // Delete existing and re-insert
    await supabase
      .from("pricing_rules")
      .delete()
      .eq("establishment_id", establishmentId);

    const toInsert = prices
      .filter((p) => p.price_cents > 0)
      .map((p) => ({
        establishment_id: establishmentId,
        season_id: p.season_id,
        row_id: p.row_id,
        row_number: p.row_number,
        element_type: p.element_type,
        duration: p.duration,
        duration_type: p.duration,
        base_price: p.price_cents / 100,
        price_cents: p.price_cents,
        weekend_markup_percent: p.weekend_markup_percent,
      }));

    if (toInsert.length > 0) {
      await supabase.from("pricing_rules").insert(toInsert);
    }

    // Reload to get real IDs
    const { data: fresh } = await supabase
      .from("pricing_rules")
      .select("*")
      .eq("establishment_id", establishmentId)
      .order("row_number");

    if (fresh) setPrices(fresh);

    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
    setSaving(false);
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-brand-azure" />
      </div>
    );
  }

  const durations = ["full_day", "half_day_morning", "weekly", "monthly", "seasonal"];

  // Group rows by zone
  const rowsByZone = maps.map((map) => ({
    map,
    rows: zoneRows.filter((r) => r.map_id === map.id),
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Prezzi e stagioni</h1>
          <p className="text-muted-foreground">
            Configura i periodi e i prezzi per zona e fila.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowAddSeason(true)}>
            <Plus className="h-4 w-4" />
            Aggiungi stagione
          </Button>
          <Button variant="brand" onClick={savePrices} disabled={saving}>
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : saved ? (
              <Check className="h-4 w-4" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {saved ? "Salvato!" : "Salva prezzi"}
          </Button>
        </div>
      </div>

      {/* Aggiungi stagione */}
      {showAddSeason && (
        <Card className="border-brand-azure/30">
          <CardContent className="space-y-3 p-4">
            <div className="grid gap-3 sm:grid-cols-4">
              <div>
                <label className="mb-1 block text-sm font-medium">Nome</label>
                <Input
                  placeholder="Bassa stagione"
                  value={newSeason.name}
                  onChange={(e) => setNewSeason({ ...newSeason, name: e.target.value })}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Tipo</label>
                <select
                  className="flex h-12 w-full rounded-lg border-2 border-input bg-background px-3 py-2 text-base"
                  value={newSeason.season_type}
                  onChange={(e) => setNewSeason({ ...newSeason, season_type: e.target.value })}
                >
                  <option value="low">Bassa</option>
                  <option value="mid">Media</option>
                  <option value="high">Alta</option>
                  <option value="peak">Altissima</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Dal</label>
                <Input
                  type="date"
                  value={newSeason.start_date}
                  onChange={(e) => setNewSeason({ ...newSeason, start_date: e.target.value })}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Al</label>
                <Input
                  type="date"
                  value={newSeason.end_date}
                  onChange={(e) => setNewSeason({ ...newSeason, end_date: e.target.value })}
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="brand" onClick={addSeason}>
                <Plus className="h-4 w-4" />
                Aggiungi
              </Button>
              <Button variant="outline" onClick={() => setShowAddSeason(false)}>
                Annulla
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stagioni + prezzi */}
      {seasons.length === 0 ? (
        <Card>
          <CardContent className="flex min-h-[200px] flex-col items-center justify-center p-6">
            <CalendarDays className="mb-4 h-12 w-12 text-muted-foreground/30" />
            <p className="text-center text-muted-foreground">
              Nessuna stagione configurata. Aggiungi la prima per iniziare.
            </p>
          </CardContent>
        </Card>
      ) : (
        seasons.map((season) => (
          <Card key={season.id}>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Badge className={SEASON_COLORS[season.season_type]}>
                  {SEASON_LABELS[season.season_type]}
                </Badge>
                {season.name}
                <span className="text-sm font-normal text-muted-foreground">
                  {season.start_date} — {season.end_date}
                </span>
              </CardTitle>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-destructive"
                onClick={() => deleteSeason(season.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-6">
              {rowsByZone.map(({ map, rows }) => {
                if (rows.length === 0) return null;
                const zoneType = getZoneType(map.name);
                const Icon = ZONE_ICONS[zoneType] || Waves;

                return (
                  <div key={map.id}>
                    <div className="mb-3 flex items-center gap-2">
                      <Icon className="h-4 w-4 text-brand-azure" />
                      <span className="text-sm font-semibold text-brand-azure">
                        {map.name}
                      </span>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b">
                            <th className="pb-2 text-left font-medium text-muted-foreground">
                              Fila
                            </th>
                            {durations.map((d) => (
                              <th key={d} className="pb-2 text-center font-medium text-muted-foreground">
                                {DURATION_LABELS[d]}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {rows.map((row) =>
                            row.elementTypes.map((elType) => {
                              const ElIcon = ELEMENT_TYPE_ICONS[elType] || Umbrella;
                              const elLabel = ELEMENT_TYPE_LABELS[elType] || "Ombrellone";
                              const showTypeLabel = row.elementTypes.length > 1;
                              return (
                                <tr key={`${row.row_id}-${elType}`} className="border-b last:border-0">
                                  <td className="py-2 font-medium">
                                    <div className="flex items-center gap-2">
                                      <ElIcon className="h-4 w-4 text-muted-foreground" />
                                      <span>
                                        {row.label || `Fila ${row.row_number}`}
                                        {showTypeLabel && (
                                          <span className="ml-1 text-xs text-muted-foreground">({elLabel})</span>
                                        )}
                                      </span>
                                    </div>
                                  </td>
                                  {durations.map((d) => (
                                    <td key={d} className="px-1 py-2 text-center">
                                      <div className="flex items-center justify-center gap-1">
                                        <Euro className="h-3 w-3 text-muted-foreground" />
                                        <Input
                                          type="number"
                                          min="0"
                                          className="h-9 w-20 text-center text-sm"
                                          placeholder="0"
                                          value={getPrice(season.id, d, row.row_id, elType)}
                                          onChange={(e) => setPrice(season.id, d, row.row_id, row.row_number, elType, e.target.value)}
                                        />
                                      </div>
                                    </td>
                                  ))}
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })}
              {zoneRows.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  Nessuna fila trovata. Vai alla mappa stabilimento per aggiungere file.
                </p>
              )}
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}

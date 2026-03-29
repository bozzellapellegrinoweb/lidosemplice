"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ArrowRight,
  ArrowLeft,
  Loader2,
  Building2,
  Map,
  Euro,
  Check,
  Umbrella,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import { slugify } from "@/lib/utils";

const MAP_TEMPLATES = [
  {
    id: "small",
    label: "Piccolo",
    description: "~50 ombrelloni, 3 file",
    rows: [
      { label: "Prima fila", count: 12 },
      { label: "Seconda fila", count: 15 },
      { label: "Terza fila", count: 20 },
    ],
  },
  {
    id: "medium",
    label: "Medio",
    description: "~150 ombrelloni, 5 file",
    rows: [
      { label: "Prima fila", count: 15 },
      { label: "Seconda fila", count: 20 },
      { label: "Terza fila", count: 30 },
      { label: "Quarta fila", count: 35 },
      { label: "Quinta fila", count: 40 },
    ],
  },
  {
    id: "large",
    label: "Grande",
    description: "~300 ombrelloni, 7 file",
    rows: [
      { label: "Prima fila", count: 20 },
      { label: "Seconda fila", count: 30 },
      { label: "Terza fila", count: 40 },
      { label: "Quarta fila", count: 45 },
      { label: "Quinta fila", count: 50 },
      { label: "Sesta fila", count: 55 },
      { label: "Settima fila", count: 60 },
    ],
  },
  {
    id: "custom",
    label: "Personalizzato",
    description: "Configurerai la mappa dopo",
    rows: [],
  },
];

const ROW_LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

export default function NuovoStabilimentoPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Step 1
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");

  // Step 2
  const [selectedTemplate, setSelectedTemplate] = useState("medium");

  // Step 3
  const [seasonStart, setSeasonStart] = useState("2026-06-01");
  const [seasonEnd, setSeasonEnd] = useState("2026-09-15");
  const [rowPrices, setRowPrices] = useState<Record<number, number>>({
    1: 45,
    2: 35,
    3: 25,
    4: 20,
    5: 15,
    6: 12,
    7: 10,
  });

  const template = MAP_TEMPLATES.find((t) => t.id === selectedTemplate)!;

  async function handleCreate() {
    setLoading(true);
    setError("");

    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setError("Devi essere loggato.");
        setLoading(false);
        return;
      }

      // Generate unique slug
      let slug = slugify(name);
      const { data: existing } = await supabase
        .from("establishments")
        .select("slug")
        .like("slug", `${slug}%`);

      if (existing && existing.length > 0) {
        slug = `${slug}-${existing.length + 1}`;
      }

      // Create establishment
      const { data: establishment, error: estError } = await supabase
        .from("establishments")
        .insert({
          owner_id: user.id,
          name,
          slug,
          city,
          phone,
          email: email || user.email,
          subscription_status: "trial",
          subscription_expires_at: new Date(
            Date.now() + 14 * 24 * 60 * 60 * 1000
          ).toISOString(),
        })
        .select("id")
        .single();

      if (estError || !establishment) {
        setError(estError?.message || "Errore nella creazione.");
        setLoading(false);
        return;
      }

      // Create member
      await supabase.from("establishment_members").insert({
        establishment_id: establishment.id,
        user_id: user.id,
        role: "admin",
        permissions: {
          check_in: true,
          bookings: true,
          bar_orders: true,
          pricing: true,
          analytics: true,
          settings: true,
        },
      });

      // Update user role
      await supabase
        .from("user_profiles")
        .update({ role: "admin" })
        .eq("id", user.id);

      // Create beach map
      const { data: beachMap } = await supabase
        .from("beach_maps")
        .insert({
          establishment_id: establishment.id,
          name: "Spiaggia",
          width: 100,
          height: 50,
          is_active: true,
        })
        .select("id")
        .single();

      // Create rows and elements from template
      if (beachMap && template.rows.length > 0) {
        for (let i = 0; i < template.rows.length; i++) {
          const rowDef = template.rows[i];
          const letter = ROW_LETTERS[i] || `R${i + 1}`;

          const { data: row } = await supabase
            .from("map_rows")
            .insert({
              beach_map_id: beachMap.id,
              row_number: i + 1,
              label: rowDef.label,
              distance_from_shore: (i + 1) * 5,
            })
            .select("id")
            .single();

          if (row) {
            const elements = Array.from({ length: rowDef.count }, (_, j) => ({
              map_row_id: row.id,
              element_type: "umbrella" as const,
              label: `${letter}${j + 1}`,
              position_x: j,
              position_y: 0,
              max_sunbeds: i === 0 ? 2 : 3,
              is_premium: i === 0,
              is_active: true,
            }));

            await supabase.from("map_elements").insert(elements);
          }
        }
      }

      // Create season and pricing rules
      const { data: season } = await supabase
        .from("seasons")
        .insert({
          establishment_id: establishment.id,
          name: "Estate 2026",
          season_type: "high",
          start_date: seasonStart,
          end_date: seasonEnd,
        })
        .select("id")
        .single();

      if (season) {
        const rules = template.rows.map((_, i) => ({
          establishment_id: establishment.id,
          season_id: season.id,
          row_number: i + 1,
          duration_type: "full_day",
          price_cents: (rowPrices[i + 1] || 15) * 100,
        }));

        if (rules.length > 0) {
          await supabase.from("pricing_rules").insert(rules);
        }
      }

      router.push(`/dashboard/${slug}`);
    } catch {
      setError("Si è verificato un errore. Riprova.");
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <Logo size="sm" className="mx-auto mb-4" />
          <CardTitle className="text-xl">Configura il tuo stabilimento</CardTitle>
          <p className="text-sm text-muted-foreground">
            Pronto in 3 semplici passi.
          </p>

          {/* Progress */}
          <div className="mt-4 flex items-center justify-center gap-2">
            {[1, 2, 3].map((s) => (
              <div key={s} className="flex items-center gap-2">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold transition-colors ${
                    s < step
                      ? "bg-available text-white"
                      : s === step
                        ? "bg-brand-azure text-white"
                        : "bg-muted text-muted-foreground"
                  }`}
                >
                  {s < step ? <Check className="h-4 w-4" /> : s}
                </div>
                {s < 3 && (
                  <div
                    className={`h-0.5 w-8 rounded ${
                      s < step ? "bg-available" : "bg-muted"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </CardHeader>

        <CardContent>
          {error && (
            <div className="mb-4 rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {/* Step 1: Dati base */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-lg font-semibold">
                <Building2 className="h-5 w-5 text-brand-azure" />
                Dati dello stabilimento
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium">
                  Nome dello stabilimento *
                </label>
                <Input
                  placeholder="Lido Azzurro"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium">
                  Citta *
                </label>
                <Input
                  placeholder="Rimini"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium">
                  Telefono
                </label>
                <Input
                  placeholder="+39 0541 123456"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium">
                  Email di contatto
                </label>
                <Input
                  type="email"
                  placeholder="info@lidoazzurro.it"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <Button
                variant="brand"
                size="lg"
                className="w-full"
                disabled={!name || !city}
                onClick={() => setStep(2)}
              >
                Avanti
                <ArrowRight className="h-5 w-5" />
              </Button>
            </div>
          )}

          {/* Step 2: Template mappa */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-lg font-semibold">
                <Map className="h-5 w-5 text-brand-azure" />
                Scegli la dimensione dello stabilimento
              </div>
              <p className="text-sm text-muted-foreground">
                Potrai modificare tutto nel dettaglio dalla mappa dopo.
              </p>

              <div className="space-y-3">
                {MAP_TEMPLATES.map((tpl) => (
                  <button
                    key={tpl.id}
                    onClick={() => setSelectedTemplate(tpl.id)}
                    className={`flex w-full items-center gap-4 rounded-lg border p-4 text-left transition-all ${
                      selectedTemplate === tpl.id
                        ? "border-brand-azure bg-brand-azure/5 ring-1 ring-brand-azure/30"
                        : "border-border hover:border-brand-azure/30 hover:bg-muted/50"
                    }`}
                  >
                    <div
                      className={`flex h-12 w-12 items-center justify-center rounded-xl ${
                        selectedTemplate === tpl.id
                          ? "bg-brand-azure/10"
                          : "bg-muted"
                      }`}
                    >
                      <Umbrella
                        className={`h-6 w-6 ${
                          selectedTemplate === tpl.id
                            ? "text-brand-azure"
                            : "text-muted-foreground"
                        }`}
                      />
                    </div>
                    <div>
                      <p className="font-semibold">{tpl.label}</p>
                      <p className="text-sm text-muted-foreground">
                        {tpl.description}
                      </p>
                      {tpl.rows.length > 0 && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          {tpl.rows.map((r) => `${r.count}`).join(" + ")} ={" "}
                          {tpl.rows.reduce((s, r) => s + r.count, 0)} ombrelloni
                        </p>
                      )}
                    </div>
                  </button>
                ))}
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => setStep(1)}
                >
                  <ArrowLeft className="h-5 w-5" />
                  Indietro
                </Button>
                <Button
                  variant="brand"
                  size="lg"
                  className="flex-1"
                  onClick={() => setStep(3)}
                >
                  Avanti
                  <ArrowRight className="h-5 w-5" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Stagione e prezzi */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-lg font-semibold">
                <Euro className="h-5 w-5 text-brand-azure" />
                Stagione e prezzi base
              </div>
              <p className="text-sm text-muted-foreground">
                Imposta i prezzi giornalieri per fila. Potrai aggiungere altre stagioni e durate dopo.
              </p>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-sm font-medium">
                    Inizio stagione
                  </label>
                  <Input
                    type="date"
                    value={seasonStart}
                    onChange={(e) => setSeasonStart(e.target.value)}
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium">
                    Fine stagione
                  </label>
                  <Input
                    type="date"
                    value={seasonEnd}
                    onChange={(e) => setSeasonEnd(e.target.value)}
                  />
                </div>
              </div>

              {template.rows.length > 0 ? (
                <div className="space-y-2">
                  <label className="block text-sm font-medium">
                    Prezzo giornaliero per fila
                  </label>
                  {template.rows.map((row, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between rounded-lg border p-3"
                    >
                      <span className="text-sm">
                        {row.label}{" "}
                        <span className="text-muted-foreground">
                          ({row.count} omb.)
                        </span>
                      </span>
                      <div className="flex items-center gap-1">
                        <Input
                          type="number"
                          min="0"
                          step="1"
                          className="w-20 text-right"
                          value={rowPrices[i + 1] || 0}
                          onChange={(e) =>
                            setRowPrices({
                              ...rowPrices,
                              [i + 1]: parseInt(e.target.value) || 0,
                            })
                          }
                        />
                        <span className="text-sm text-muted-foreground">
                          &euro;
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-lg bg-muted p-4 text-center text-sm text-muted-foreground">
                  Configurerai mappa e prezzi dalla dashboard.
                </div>
              )}

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => setStep(2)}
                >
                  <ArrowLeft className="h-5 w-5" />
                  Indietro
                </Button>
                <Button
                  variant="brand"
                  size="lg"
                  className="flex-1"
                  disabled={loading}
                  onClick={handleCreate}
                >
                  {loading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <>
                      Crea stabilimento
                      <Check className="h-5 w-5" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

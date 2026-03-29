"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Save,
  Building2,
  Clock,
  Palette,
  CreditCard,
  Globe,
  ExternalLink,
  Loader2,
  Check,
  MapPin,
  Copy,
  CheckCircle2,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface EstablishmentSettings {
  id: string;
  name: string;
  slug: string;
  description: string;
  address: string;
  city: string;
  province: string;
  cap: string;
  phone: string;
  email: string;
  website: string;
  check_in_time: string;
  check_out_time: string;
  primary_color: string;
  secondary_color: string;
  paypal_email: string;
  paypal_enabled: boolean;
  google_place_id: string;
  latitude: string;
  longitude: string;
}

export default function ImpostazioniPage() {
  const params = useParams();
  const slug = params.slug as string;

  const [settings, setSettings] = useState<EstablishmentSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("establishments")
        .select("id, name, slug, description, address, city, province, cap, phone, email, website, check_in_time, check_out_time, primary_color, secondary_color, paypal_email, paypal_enabled, google_place_id, latitude, longitude")
        .eq("slug", slug)
        .single();

      if (error) {
        setError("Errore nel caricamento dei dati.");
      } else if (data) {
        setSettings({
          ...data,
          description: data.description || "",
          address: data.address || "",
          city: data.city || "",
          province: data.province || "",
          cap: data.cap || "",
          phone: data.phone || "",
          email: data.email || "",
          website: data.website || "",
          check_in_time: data.check_in_time || "08:00",
          check_out_time: data.check_out_time || "19:00",
          primary_color: data.primary_color || "#00BFFF",
          secondary_color: data.secondary_color || "#0B1829",
          paypal_email: data.paypal_email || "",
          paypal_enabled: data.paypal_enabled || false,
          google_place_id: data.google_place_id || "",
          latitude: data.latitude?.toString() || "",
          longitude: data.longitude?.toString() || "",
        });
      }
      setLoading(false);
    }
    load();
  }, [slug]);

  function updateField(field: keyof EstablishmentSettings, value: string) {
    if (!settings) return;
    setSettings({ ...settings, [field]: value });
    setSaved(false);
  }

  async function handleSave() {
    if (!settings) return;
    setSaving(true);
    setError("");

    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("establishments")
      .update({
        name: settings.name,
        description: settings.description,
        address: settings.address,
        city: settings.city,
        province: settings.province,
        cap: settings.cap,
        phone: settings.phone,
        email: settings.email,
        website: settings.website,
        check_in_time: settings.check_in_time,
        check_out_time: settings.check_out_time,
        primary_color: settings.primary_color,
        secondary_color: settings.secondary_color,
        paypal_email: settings.paypal_email || null,
        paypal_enabled: settings.paypal_enabled,
        google_place_id: settings.google_place_id || null,
        latitude: settings.latitude ? parseFloat(settings.latitude) : null,
        longitude: settings.longitude ? parseFloat(settings.longitude) : null,
      })
      .eq("id", settings.id);

    if (updateError) {
      setError("Errore nel salvataggio: " + updateError.message);
    } else {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    }
    setSaving(false);
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-brand-azure" />
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-muted-foreground">Stabilimento non trovato.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Impostazioni</h1>
          <p className="text-muted-foreground">
            Configura il tuo stabilimento.
          </p>
        </div>
        <Button variant="brand" onClick={handleSave} disabled={saving}>
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : saved ? (
            <Check className="h-4 w-4" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          {saved ? "Salvato!" : "Salva modifiche"}
        </Button>
      </div>

      {error && (
        <div className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Dati stabilimento */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Building2 className="h-5 w-5" />
            Dati stabilimento
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium">Nome</label>
              <Input value={settings.name} onChange={(e) => updateField("name", e.target.value)} />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Slug (URL)</label>
              <div className="flex items-center gap-1">
                <Input value={settings.slug} disabled className="bg-muted" />
                <span className="whitespace-nowrap text-sm text-muted-foreground">.lidofacile.it</span>
              </div>
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-sm font-medium">Descrizione</label>
              <Input value={settings.description} onChange={(e) => updateField("description", e.target.value)} />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Indirizzo</label>
              <Input value={settings.address} onChange={(e) => updateField("address", e.target.value)} />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium">Citta</label>
                <Input value={settings.city} onChange={(e) => updateField("city", e.target.value)} />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium">Prov.</label>
                <Input value={settings.province} onChange={(e) => updateField("province", e.target.value)} />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium">CAP</label>
                <Input value={settings.cap} onChange={(e) => updateField("cap", e.target.value)} />
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Telefono</label>
              <Input value={settings.phone} onChange={(e) => updateField("phone", e.target.value)} />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Email</label>
              <Input value={settings.email} onChange={(e) => updateField("email", e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Orari */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Clock className="h-5 w-5" />
            Orari
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium">Apertura (check-in)</label>
              <Input type="time" value={settings.check_in_time} onChange={(e) => updateField("check_in_time", e.target.value)} />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Chiusura (check-out)</label>
              <Input type="time" value={settings.check_out_time} onChange={(e) => updateField("check_out_time", e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Colori brand */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Palette className="h-5 w-5" />
            Personalizzazione
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium">Colore primario</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={settings.primary_color}
                  onChange={(e) => updateField("primary_color", e.target.value)}
                  className="h-10 w-10 cursor-pointer rounded border"
                />
                <Input value={settings.primary_color} onChange={(e) => updateField("primary_color", e.target.value)} className="flex-1" />
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Colore secondario</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={settings.secondary_color}
                  onChange={(e) => updateField("secondary_color", e.target.value)}
                  className="h-10 w-10 cursor-pointer rounded border"
                />
                <Input value={settings.secondary_color} onChange={(e) => updateField("secondary_color", e.target.value)} className="flex-1" />
              </div>
            </div>
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            Questi colori verranno usati nella pagina pubblica del tuo stabilimento.
          </p>
        </CardContent>
      </Card>

      {/* Pagamenti */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <CreditCard className="h-5 w-5" />
            Metodi di pagamento
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Stripe */}
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div>
              <p className="font-medium">Stripe</p>
              <p className="text-sm text-muted-foreground">
                Carte di credito/debito. Collega il tuo account Stripe.
              </p>
            </div>
            <Button variant="brand">
              <ExternalLink className="h-4 w-4" />
              Collega Stripe
            </Button>
          </div>

          {/* PayPal */}
          <div className="rounded-lg border p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">PayPal</p>
                <p className="text-sm text-muted-foreground">
                  Ricevi pagamenti tramite PayPal. Inserisci la tua email PayPal Business.
                </p>
              </div>
              <label className="relative inline-flex cursor-pointer items-center">
                <input
                  type="checkbox"
                  className="peer sr-only"
                  checked={settings.paypal_enabled}
                  onChange={(e) => {
                    setSettings({ ...settings, paypal_enabled: e.target.checked });
                    setSaved(false);
                  }}
                />
                <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-brand-azure peer-checked:after:translate-x-full peer-checked:after:border-white" />
              </label>
            </div>
            {settings.paypal_enabled && (
              <div>
                <label className="mb-1.5 block text-sm font-medium">Email PayPal Business</label>
                <Input
                  type="email"
                  placeholder="pagamenti@tuolido.it"
                  value={settings.paypal_email}
                  onChange={(e) => updateField("paypal_email", e.target.value)}
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  I pagamenti dei clienti verranno inviati a questo indirizzo PayPal.
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Google Maps */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <MapPin className="h-5 w-5" />
            Google Maps e prenotazione
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Configura la tua posizione e attiva il pulsante &quot;Prenota ora&quot; su Google Maps.
          </p>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium">Google Place ID</label>
              <Input
                placeholder="ChIJ..."
                value={settings.google_place_id}
                onChange={(e) => updateField("google_place_id", e.target.value)}
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Trovi il Place ID cercando il tuo lido su Google Maps.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium">Latitudine</label>
                <Input
                  type="text"
                  placeholder="41.9028"
                  value={settings.latitude}
                  onChange={(e) => updateField("latitude", e.target.value)}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium">Longitudine</label>
                <Input
                  type="text"
                  placeholder="12.4964"
                  value={settings.longitude}
                  onChange={(e) => updateField("longitude", e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Link prenotazione per Google */}
          <div className="rounded-lg border border-brand-azure/20 bg-brand-azure/5 p-4 space-y-3">
            <p className="text-sm font-medium">Link prenotazione per Google Maps</p>
            <p className="text-xs text-muted-foreground">
              Copia questo link e aggiungilo al tuo Profilo Google Business come &quot;Link di prenotazione&quot;.
              I clienti vedranno il pulsante &quot;Prenota&quot; quando cercano il tuo lido su Google.
            </p>
            <div className="flex items-center gap-2">
              <Input
                readOnly
                value={`https://lidofacile.it/lido/${settings.slug}/prenota`}
                className="flex-1 bg-white text-sm"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  navigator.clipboard.writeText(`https://lidofacile.it/lido/${settings.slug}/prenota`);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
              >
                {copied ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                {copied ? "Copiato!" : "Copia"}
              </Button>
            </div>

            <details className="text-sm">
              <summary className="cursor-pointer font-medium text-brand-azure">
                Come attivare &quot;Prenota ora&quot; su Google Maps
              </summary>
              <ol className="mt-2 list-inside list-decimal space-y-1 text-muted-foreground">
                <li>Vai su business.google.com e accedi al tuo profilo</li>
                <li>Clicca su &quot;Modifica profilo&quot; → &quot;Contatti&quot;</li>
                <li>Nella sezione &quot;Link per appuntamenti&quot; o &quot;Prenotazione&quot;, incolla il link qui sopra</li>
                <li>Salva le modifiche. Il pulsante apparira entro 24-48 ore</li>
              </ol>
            </details>
          </div>
        </CardContent>
      </Card>

      {/* Link pubblico */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Globe className="h-5 w-5" />
            La tua pagina pubblica
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <Input
              readOnly
              value={`${settings.slug}.lidofacile.it`}
              className="flex-1 bg-muted"
            />
            <Button variant="outline" asChild>
              <a href={`/lido/${settings.slug}`} target="_blank">
                <ExternalLink className="h-4 w-4" />
                Apri
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

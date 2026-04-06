"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Save, Building2, Clock, Palette, CreditCard, Globe, ExternalLink,
  Loader2, Check, MapPin, Copy, CheckCircle2, Image as ImageIcon,
  Upload, X, Star, Sparkles, Banknote, Wallet, Link2, Building,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { AMENITY_GROUPS, DEFAULT_AMENITIES, type AmenitiesData } from "@/lib/amenities";

type PaymentMethods = {
  cash: { enabled: boolean };
  stripe: { enabled: boolean; secret_key: string; publishable_key: string };
  paypal: { enabled: boolean; email: string };
  satispay: { enabled: boolean; key_id: string; private_key: string };
  revolut: { enabled: boolean; api_key: string };
  bonifico: { enabled: boolean; iban: string; intestatario: string };
};

const DEFAULT_PAYMENT_METHODS: PaymentMethods = {
  cash: { enabled: true },
  stripe: { enabled: false, secret_key: "", publishable_key: "" },
  paypal: { enabled: false, email: "" },
  satispay: { enabled: false, key_id: "", private_key: "" },
  revolut: { enabled: false, api_key: "" },
  bonifico: { enabled: false, iban: "", intestatario: "" },
};

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
  logo_url: string;
  cover_image_url: string;
  gallery_photo_urls: string[];
  amenities: AmenitiesData;
  payment_methods: PaymentMethods;
}

// ── Google Places Autocomplete ────────────────────────────────────────────────

interface PlaceResult {
  address: string;
  city: string;
  province: string;
  cap: string;
  latitude: string;
  longitude: string;
  google_place_id: string;
}

function AddressAutocomplete({
  value,
  onSelect,
  onChange,
}: {
  value: string;
  onSelect: (result: PlaceResult) => void;
  onChange: (val: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const initedRef = useRef(false);
  const onSelectRef = useRef(onSelect);
  const onChangeRef = useRef(onChange);
  useEffect(() => { onSelectRef.current = onSelect; }, [onSelect]);
  useEffect(() => { onChangeRef.current = onChange; }, [onChange]);

  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY;
    if (!apiKey) return;

    function doInit() {
      if (initedRef.current || !inputRef.current) return;
      if (!window.google?.maps?.places) return;
      initedRef.current = true;
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const ac = new (window.google.maps.places as any).Autocomplete(inputRef.current, {
          componentRestrictions: { country: "it" },
          fields: ["address_components", "formatted_address", "geometry", "place_id"],
        });
        ac.addListener("place_changed", () => {
          const place = ac.getPlace();
          if (!place?.address_components) return;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const get = (type: string, short = false): string => {
            const c = place.address_components.find((x: any) => x.types?.includes(type));
            return (short ? c?.short_name : c?.long_name) || "";
          };
          const route = get("route");
          const num = get("street_number");
          const address = route ? `${route}${num ? ` ${num}` : ""}` : (place.formatted_address || "");
          onChangeRef.current(address);
          onSelectRef.current({
            address,
            city: get("locality") || get("administrative_area_level_3"),
            province: get("administrative_area_level_2", true),
            cap: get("postal_code"),
            latitude: place.geometry?.location?.lat().toString() || "",
            longitude: place.geometry?.location?.lng().toString() || "",
            google_place_id: place.place_id || "",
          });
        });
      } catch (err) {
        console.error("Autocomplete init failed:", err);
        initedRef.current = false;
      }
    }

    if (window.google?.maps?.places) { doInit(); return; }

    if (document.getElementById("gm-script")) {
      const iv = setInterval(() => {
        if (window.google?.maps?.places) { clearInterval(iv); doInit(); }
      }, 200);
      return () => clearInterval(iv);
    }

    (window as unknown as Record<string, unknown>).__gmPlacesReady = doInit;
    const script = document.createElement("script");
    script.id = "gm-script";
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&language=it&callback=__gmPlacesReady`;
    script.async = true;
    script.defer = true;
    document.head.appendChild(script);
  }, []);

  return (
    <input
      ref={inputRef}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder="Es. Via Roma 1, Rimini"
      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    />
  );
}

// ── Ottimizzazione immagine lato client ───────────────────────────────────────
// Ridimensiona e converte in WebP prima dell'upload.
// logo: max 400px, gallery/cover: max 1920px — qualità 85%

async function optimizeImage(file: File, maxPx: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const ratio = Math.min(1, maxPx / Math.max(img.width, img.height));
      const w = Math.round(img.width * ratio);
      const h = Math.round(img.height * ratio);
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0, w, h);
      canvas.toBlob(
        (blob) => { blob ? resolve(blob) : reject(new Error("canvas.toBlob failed")); },
        "image/webp",
        0.85
      );
    };
    img.onerror = reject;
    img.src = url;
  });
}

// ── Upload helper ─────────────────────────────────────────────────────────────

async function uploadPhoto(
  file: File,
  establishmentId: string,
  filename: string,
  maxPx = 1920
): Promise<string | null> {
  const optimized = await optimizeImage(file, maxPx).catch(() => file);
  // Forza estensione .webp sul filename
  const webpName = filename.replace(/\.[^.]+$/, "") + ".webp";
  const supabase = createClient();
  const path = `${establishmentId}/${webpName}`;
  const { error } = await supabase.storage
    .from("establishment-photos")
    .upload(path, optimized, { upsert: true, contentType: "image/webp" });
  if (error) { console.error("Upload error:", error); return null; }
  const { data } = supabase.storage.from("establishment-photos").getPublicUrl(path);
  return data.publicUrl;
}

// ── Single photo upload ───────────────────────────────────────────────────────

function SinglePhotoUpload({
  label, hint, value, onChange, fieldName,
}: {
  label: string; hint: string; value: string; onChange: (url: string) => void; fieldName: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function handleFile(file: File, estId: string) {
    setUploading(true);
    const ext = file.name.split(".").pop() || "jpg";
    const url = await uploadPhoto(file, estId, `${fieldName}-${Date.now()}.${ext}`);
    if (url) onChange(url);
    setUploading(false);
  }

  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium">{label}</label>
      <p className="mb-2 text-xs text-muted-foreground">{hint}</p>
      <div className="flex items-start gap-3">
        {value ? (
          <div className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={value} alt={label} className={`rounded-lg object-cover border ${fieldName === "logo" ? "h-16 w-16" : "h-24 w-40"}`} />
            <button
              onClick={() => onChange("")}
              className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-white"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ) : (
          <div className={`flex flex-col items-center justify-center rounded-lg border-2 border-dashed bg-muted/50 ${fieldName === "logo" ? "h-16 w-16" : "h-24 w-40"}`}>
            <ImageIcon className="h-5 w-5 text-muted-foreground" />
          </div>
        )}
        <div className="flex flex-col gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
          >
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {value ? "Cambia" : "Carica"}
          </Button>
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            // We need the establishment ID — passed via data attribute trick
            onChange={async (e) => {
              const file = e.target.files?.[0];
              const estId = (e.target as HTMLInputElement).dataset.estid || "";
              if (file && estId) await handleFile(file, estId);
              e.target.value = "";
            }}
          />
        </div>
      </div>
    </div>
  );
}

export default function ImpostazioniPage() {
  const params = useParams();
  const slug = params.slug as string;

  const searchParams = useSearchParams();
  const stripeOk = searchParams.get("stripe_ok") === "1";
  const stripeError = searchParams.get("stripe_error") === "1";
  const stripeErrorMsg = searchParams.get("msg") ?? "";

  const [settings, setSettings] = useState<EstablishmentSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [error, setError] = useState("");

  // Avvisa il browser se si tenta di abbandonare la pagina con modifiche non salvate
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (!isDirty) return;
      e.preventDefault();
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);
  const [copied, setCopied] = useState(false);
  const [galleryUploading, setGalleryUploading] = useState(false);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const [satispayToken, setSatispayToken] = useState("");
  const [satispayActivating, setSatispayActivating] = useState(false);
  const [satispayError, setSatispayError] = useState("");

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("establishments")
        .select("id, name, slug, description, address, city, province, cap, phone, email, website, check_in_time, check_out_time, primary_color, secondary_color, paypal_email, paypal_enabled, google_place_id, latitude, longitude, logo_url, cover_image_url, gallery_photo_urls, amenities, payment_methods")
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
          logo_url: data.logo_url || "",
          cover_image_url: data.cover_image_url || "",
          gallery_photo_urls: data.gallery_photo_urls || [],
          amenities: { ...DEFAULT_AMENITIES, ...(data.amenities || {}) },
          payment_methods: { ...DEFAULT_PAYMENT_METHODS, ...(data.payment_methods || {}) },
        });
      }
      setLoading(false);
    }
    load();
  }, [slug]);

  function handlePlaceSelect(place: PlaceResult) {
    if (!settings) return;
    setSettings({
      ...settings,
      address: place.address,
      city: place.city,
      province: place.province,
      cap: place.cap,
      latitude: place.latitude,
      longitude: place.longitude,
      google_place_id: place.google_place_id,
    });
  }

  function updateField(field: keyof EstablishmentSettings, value: string | boolean | string[]) {
    if (!settings) return;
    setSettings({ ...settings, [field]: value });
    setSaved(false);
    setIsDirty(true);
  }

  function updatePaymentMethod<K extends keyof PaymentMethods>(
    method: K,
    field: keyof PaymentMethods[K],
    value: unknown
  ) {
    if (!settings) return;
    setSettings({
      ...settings,
      payment_methods: {
        ...settings.payment_methods,
        [method]: { ...settings.payment_methods[method], [field]: value },
      },
    });
    setSaved(false);
  }

  async function activateSatispay() {
    if (!settings || !satispayToken.trim()) return;
    setSatispayActivating(true);
    setSatispayError("");
    try {
      const res = await fetch("/api/satispay/activate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ establishmentId: settings.id, activationToken: satispayToken.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        setSatispayToken("");
        // Reload settings to reflect new key_id
        setSettings((prev) => prev ? {
          ...prev,
          payment_methods: {
            ...prev.payment_methods,
            satispay: { ...prev.payment_methods.satispay, enabled: true, key_id: data.key_id, private_key: "•••" },
          },
        } : prev);
      } else {
        setSatispayError(data.error ?? "Attivazione non riuscita");
      }
    } catch {
      setSatispayError("Errore di rete");
    } finally {
      setSatispayActivating(false);
    }
  }

  function updateAmenity(key: string, value: boolean | number | null) {
    if (!settings) return;
    setSettings({
      ...settings,
      amenities: { ...settings.amenities, [key]: value },
    });
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
        paypal_email: settings.payment_methods.paypal.email || null,
        paypal_enabled: settings.payment_methods.paypal.enabled,
        payment_methods: settings.payment_methods,
        google_place_id: settings.google_place_id || null,
        latitude: settings.latitude ? parseFloat(settings.latitude) : null,
        longitude: settings.longitude ? parseFloat(settings.longitude) : null,
        logo_url: settings.logo_url || null,
        cover_image_url: settings.cover_image_url || null,
        gallery_photo_urls: settings.gallery_photo_urls,
        amenities: settings.amenities,
      })
      .eq("id", settings.id);

    if (updateError) {
      setError("Errore nel salvataggio: " + updateError.message);
    } else {
      setSaved(true);
      setIsDirty(false);
      setTimeout(() => setSaved(false), 3000);
    }
    setSaving(false);
  }

  async function handleGalleryUpload(files: FileList) {
    if (!settings) return;
    setGalleryUploading(true);
    const newUrls: string[] = [];
    for (const file of Array.from(files)) {
      const ext = file.name.split(".").pop() || "jpg";
      const url = await uploadPhoto(file, settings.id, `gallery-${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`);
      if (url) newUrls.push(url);
    }
    updateField("gallery_photo_urls", [...settings.gallery_photo_urls, ...newUrls]);
    setGalleryUploading(false);
  }

  function removeGalleryPhoto(url: string) {
    if (!settings) return;
    updateField("gallery_photo_urls", settings.gallery_photo_urls.filter((u) => u !== url));
  }

  async function uploadSinglePhoto(file: File, fieldName: "logo_url" | "cover_image_url") {
    if (!settings) return;
    const isLogo = fieldName === "logo_url";
    const filename = `${fieldName.replace("_url", "")}-${Date.now()}.webp`;
    const url = await uploadPhoto(file, settings.id, filename, isLogo ? 400 : 1920);
    if (url) updateField(fieldName, url);
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
          <p className="text-muted-foreground">Configura il tuo stabilimento.</p>
        </div>
        <Button variant="brand" onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : saved ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}
          {saved ? "Salvato!" : "Salva modifiche"}
        </Button>
      </div>

      {error && (
        <div className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div>
      )}

      {/* ── Dati stabilimento ── */}
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
                <span className="whitespace-nowrap text-sm text-muted-foreground">.lido-facile.it</span>
              </div>
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-sm font-medium">Descrizione</label>
              <textarea
                value={settings.description}
                onChange={(e) => updateField("description", e.target.value)}
                rows={3}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:border-brand-azure focus:ring-2 focus:ring-brand-azure/20"
                placeholder="Descrivi il tuo stabilimento: posizione, atmosfera, punti di forza..."
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">
                Indirizzo
                {process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY && (
                  <span className="ml-2 text-xs text-muted-foreground">— digita per cercare automaticamente</span>
                )}
              </label>
              <AddressAutocomplete
                value={settings.address}
                onSelect={handlePlaceSelect}
                onChange={(val) => updateField("address", val)}
              />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium">Città</label>
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
            <div>
              <label className="mb-1.5 block text-sm font-medium">Sito web</label>
              <Input value={settings.website} onChange={(e) => updateField("website", e.target.value)} placeholder="https://..." />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Foto & Immagini ── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <ImageIcon className="h-5 w-5" />
            Foto & Immagini
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Logo + Cover */}
          <div className="grid gap-6 sm:grid-cols-2">
            {/* Logo */}
            <div>
              <label className="mb-1.5 block text-sm font-medium">Logo</label>
              <p className="mb-3 text-xs text-muted-foreground">Formato quadrato consigliato. Max 5MB.</p>
              <div className="flex items-start gap-3">
                {settings.logo_url ? (
                  <div className="relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={settings.logo_url} alt="Logo" className="h-20 w-20 rounded-xl border object-cover" />
                    <button onClick={() => updateField("logo_url", "")} className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-white">
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ) : (
                  <div className="flex h-20 w-20 flex-col items-center justify-center rounded-xl border-2 border-dashed bg-muted/40">
                    <ImageIcon className="h-6 w-6 text-muted-foreground" />
                  </div>
                )}
                <label className="cursor-pointer">
                  <span className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium hover:bg-muted transition">
                    <Upload className="h-4 w-4" />
                    {settings.logo_url ? "Cambia logo" : "Carica logo"}
                  </span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadSinglePhoto(f, "logo_url"); e.target.value = ""; }}
                  />
                </label>
              </div>
            </div>

            {/* Cover */}
            <div>
              <label className="mb-1.5 block text-sm font-medium">Foto di copertina</label>
              <p className="mb-3 text-xs text-muted-foreground">Formato orizzontale 16:9 consigliato. Max 5MB.</p>
              <div className="flex items-start gap-3">
                {settings.cover_image_url ? (
                  <div className="relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={settings.cover_image_url} alt="Cover" className="h-20 w-36 rounded-xl border object-cover" />
                    <button onClick={() => updateField("cover_image_url", "")} className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-white">
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ) : (
                  <div className="flex h-20 w-36 flex-col items-center justify-center rounded-xl border-2 border-dashed bg-muted/40">
                    <ImageIcon className="h-6 w-6 text-muted-foreground" />
                  </div>
                )}
                <label className="cursor-pointer">
                  <span className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium hover:bg-muted transition">
                    <Upload className="h-4 w-4" />
                    {settings.cover_image_url ? "Cambia cover" : "Carica cover"}
                  </span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadSinglePhoto(f, "cover_image_url"); e.target.value = ""; }}
                  />
                </label>
              </div>
            </div>
          </div>

          {/* Gallery */}
          <div>
            <label className="mb-1 block text-sm font-medium">
              Galleria foto
              <span className="ml-2 text-xs font-normal text-muted-foreground">({settings.gallery_photo_urls.length}/8 foto)</span>
            </label>
            <p className="mb-3 text-xs text-muted-foreground">Mostrate nella pagina pubblica del tuo stabilimento.</p>

            <div className="grid grid-cols-4 gap-3 sm:grid-cols-6">
              {settings.gallery_photo_urls.map((url, i) => (
                <div key={url} className="relative group aspect-square">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt={`Foto ${i + 1}`} className="h-full w-full rounded-xl border object-cover" />
                  {i === 0 && (
                    <div className="absolute bottom-1 left-1 flex items-center gap-0.5 rounded-full bg-amber-500 px-1.5 py-0.5 text-[10px] font-medium text-white">
                      <Star className="h-2.5 w-2.5" /> Cover
                    </div>
                  )}
                  <button
                    onClick={() => removeGalleryPhoto(url)}
                    className="absolute -right-1.5 -top-1.5 hidden h-5 w-5 items-center justify-center rounded-full bg-destructive text-white group-hover:flex"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}

              {settings.gallery_photo_urls.length < 8 && (
                <label className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed bg-muted/40 hover:bg-muted/70 transition">
                  {galleryUploading ? (
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  ) : (
                    <>
                      <Upload className="h-5 w-5 text-muted-foreground" />
                      <span className="text-[10px] text-muted-foreground">Aggiungi</span>
                    </>
                  )}
                  <input
                    ref={galleryInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    multiple
                    className="hidden"
                    onChange={(e) => { if (e.target.files?.length) handleGalleryUpload(e.target.files); e.target.value = ""; }}
                  />
                </label>
              )}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              💡 La prima foto della galleria appare come copertina se non hai caricato una foto di copertina separata.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* ── Caratteristiche & Dotazioni ── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Sparkles className="h-5 w-5" />
            Caratteristiche & Dotazioni
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Seleziona tutto ciò che è disponibile nel tuo stabilimento. Appare nella pagina pubblica con icone.
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {AMENITY_GROUPS.map((group) => (
            <div key={group.label}>
              <h3 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                {group.label}
              </h3>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                {group.items.map((item) => {
                  const val = settings.amenities[item.key as keyof AmenitiesData];
                  const isActive = Boolean(val);
                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => updateAmenity(item.key, !isActive)}
                      className={`flex items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left text-sm transition ${
                        isActive
                          ? "border-brand-azure/50 bg-brand-azure/10 text-brand-azure"
                          : "border-border bg-background text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      <span className="text-lg leading-none">{item.emoji}</span>
                      <span className="font-medium leading-tight">{item.label}</span>
                      {isActive && <Check className="ml-auto h-3.5 w-3.5 shrink-0" />}
                    </button>
                  );
                })}
              </div>

              {/* Campo posti parcheggio */}
              {group.label === "Parcheggio" && (settings.amenities.parking_free || settings.amenities.parking_paid) && (
                <div className="mt-3 flex items-center gap-3">
                  <label className="text-sm font-medium whitespace-nowrap">Numero posti:</label>
                  <Input
                    type="number"
                    min={0}
                    max={9999}
                    placeholder="es. 50"
                    value={settings.amenities.parking_spots ?? ""}
                    onChange={(e) => updateAmenity("parking_spots", e.target.value ? parseInt(e.target.value) : null)}
                    className="w-32"
                  />
                  <span className="text-xs text-muted-foreground">(lascia vuoto se non vuoi mostrarlo)</span>
                </div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* ── Orari ── */}
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

      {/* ── Colori brand ── */}
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
                <input type="color" value={settings.primary_color} onChange={(e) => updateField("primary_color", e.target.value)} className="h-10 w-10 cursor-pointer rounded border" />
                <Input value={settings.primary_color} onChange={(e) => updateField("primary_color", e.target.value)} className="flex-1" />
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Colore secondario</label>
              <div className="flex items-center gap-2">
                <input type="color" value={settings.secondary_color} onChange={(e) => updateField("secondary_color", e.target.value)} className="h-10 w-10 cursor-pointer rounded border" />
                <Input value={settings.secondary_color} onChange={(e) => updateField("secondary_color", e.target.value)} className="flex-1" />
              </div>
            </div>
          </div>
          <p className="mt-3 text-sm text-muted-foreground">Questi colori vengono usati nella pagina pubblica del tuo stabilimento.</p>
        </CardContent>
      </Card>

      {/* ── Pagamenti ── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <CreditCard className="h-5 w-5" />
            Metodi di pagamento accettati dai clienti
          </CardTitle>
          <p className="text-sm text-muted-foreground">Scegli quali metodi mostrare nel carrello di prenotazione.</p>
        </CardHeader>
        <CardContent className="space-y-3">

          {stripeOk && (
            <div className="flex items-center gap-2 rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              Stripe collegato con successo!
            </div>
          )}
          {stripeError && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              <p className="font-medium">Errore collegamento Stripe</p>
              {stripeErrorMsg && <p className="mt-1 text-xs opacity-80">{stripeErrorMsg}</p>}
              <p className="mt-1 text-xs opacity-70">Assicurati di aver abilitato Stripe Connect nel tuo account Stripe (dashboard.stripe.com → Connect).</p>
            </div>
          )}

          {/* Contante */}
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100">
                <Banknote className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="font-medium">Contante in loco</p>
                <p className="text-sm text-muted-foreground">Il cliente paga all&apos;arrivo in spiaggia.</p>
              </div>
            </div>
            <label className="relative inline-flex cursor-pointer items-center">
              <input type="checkbox" className="peer sr-only"
                checked={settings.payment_methods.cash.enabled}
                onChange={(e) => updatePaymentMethod("cash", "enabled", e.target.checked)} />
              <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-brand-azure peer-checked:after:translate-x-full peer-checked:after:border-white" />
            </label>
          </div>

          {/* Stripe */}
          <div className="rounded-lg border p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#635bff]/10">
                  <svg className="h-5 w-5 text-[#635bff]" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.992 3.757 7.218c0 4.039 2.467 5.76 6.476 7.219 2.585.92 3.445 1.574 3.445 2.583 0 .98-.84 1.545-2.354 1.545-1.875 0-4.965-.921-6.99-2.109l-.9 5.555C5.175 22.99 8.385 24 11.714 24c2.641 0 4.843-.624 6.328-1.813 1.664-1.305 2.525-3.236 2.525-5.732 0-4.128-2.524-5.851-6.591-7.305z"/>
                  </svg>
                </div>
                <div>
                  <p className="font-medium">Carta di credito / debito</p>
                  <p className="text-sm text-muted-foreground">Visa, Mastercard, Google Pay, Apple Pay via Stripe.</p>
                </div>
              </div>
              {settings.payment_methods.stripe.secret_key && (
                <label className="relative inline-flex cursor-pointer items-center">
                  <input type="checkbox" className="peer sr-only"
                    checked={settings.payment_methods.stripe.enabled}
                    onChange={(e) => updatePaymentMethod("stripe", "enabled", e.target.checked)} />
                  <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-brand-azure peer-checked:after:translate-x-full peer-checked:after:border-white" />
                </label>
              )}
            </div>
            <div className="space-y-2">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Chiave segreta (sk_live_...)</label>
                <Input
                  type="password"
                  placeholder="sk_live_..."
                  value={settings.payment_methods.stripe.secret_key}
                  onChange={(e) => updatePaymentMethod("stripe", "secret_key", e.target.value)}
                  className="mt-1 font-mono text-xs"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Chiave pubblica (pk_live_...)</label>
                <Input
                  type="text"
                  placeholder="pk_live_..."
                  value={settings.payment_methods.stripe.publishable_key}
                  onChange={(e) => updatePaymentMethod("stripe", "publishable_key", e.target.value)}
                  className="mt-1 font-mono text-xs"
                />
              </div>
            </div>
            {settings.payment_methods.stripe.secret_key && (
              <div className="flex items-center gap-2 text-xs text-green-600">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Stripe configurato — i pagamenti arrivano direttamente a te.
              </div>
            )}
          </div>

          {/* PayPal */}
          <div className="rounded-lg border p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#0070ba]/10">
                  <Wallet className="h-5 w-5 text-[#0070ba]" />
                </div>
                <div>
                  <p className="font-medium">PayPal</p>
                  <p className="text-sm text-muted-foreground">Il cliente paga tramite il proprio account PayPal.</p>
                </div>
              </div>
              <label className="relative inline-flex cursor-pointer items-center">
                <input type="checkbox" className="peer sr-only"
                  checked={settings.payment_methods.paypal.enabled}
                  onChange={(e) => updatePaymentMethod("paypal", "enabled", e.target.checked)} />
                <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-brand-azure peer-checked:after:translate-x-full peer-checked:after:border-white" />
              </label>
            </div>
            {settings.payment_methods.paypal.enabled && (
              <div className="space-y-3">
                <div>
                  <label className="mb-1.5 block text-sm font-medium">Email PayPal Business</label>
                  <Input type="email" placeholder="pagamenti@tuolido.it"
                    value={settings.payment_methods.paypal.email}
                    onChange={(e) => updatePaymentMethod("paypal", "email", e.target.value)} />
                  <p className="mt-1 text-xs text-muted-foreground">I clienti vengono reindirizzati alla tua pagina PayPal per completare il pagamento.</p>
                </div>
                <details className="rounded-lg bg-blue-50 border border-blue-200">
                  <summary className="cursor-pointer px-3 py-2 text-sm font-medium text-blue-800 list-none flex items-center gap-2">
                    <span>📖</span> Come trovare la tua email PayPal Business
                  </summary>
                  <div className="px-4 pb-4 pt-2 text-sm text-blue-900 space-y-1">
                    <ol className="list-decimal list-inside space-y-2">
                      <li>Accedi a <strong>paypal.com</strong> con il tuo account Business</li>
                      <li>Vai su <strong>Impostazioni account → Email</strong></li>
                      <li>Copia la tua email principale e incollala qui sopra</li>
                    </ol>
                  </div>
                </details>
              </div>
            )}
          </div>

          {/* Satispay */}
          <div className="rounded-lg border p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#e30613]/10">
                  <span className="text-sm font-black text-[#e30613]">S</span>
                </div>
                <div>
                  <p className="font-medium">Satispay</p>
                  <p className="text-sm text-muted-foreground">Pagamento immediato dal cellulare. Popolarissimo in Italia.</p>
                </div>
              </div>
              <label className="relative inline-flex cursor-pointer items-center">
                <input type="checkbox" className="peer sr-only"
                  checked={settings.payment_methods.satispay.enabled}
                  onChange={(e) => updatePaymentMethod("satispay", "enabled", e.target.checked)} />
                <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-brand-azure peer-checked:after:translate-x-full peer-checked:after:border-white" />
              </label>
            </div>

            {settings.payment_methods.satispay.enabled && (
              <div className="space-y-3">
                {/* Se già attivato */}
                {settings.payment_methods.satispay.key_id ? (
                  <div className="flex items-center gap-2 rounded-lg bg-green-50 border border-green-200 px-3 py-2 text-sm text-green-700">
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    Satispay collegato — Key ID: <span className="font-mono ml-1">{settings.payment_methods.satispay.key_id}</span>
                  </div>
                ) : (
                  /* Attivazione con token */
                  <div className="space-y-2">
                    <label className="block text-sm font-medium">Codice di attivazione Satispay</label>
                    <div className="flex gap-2">
                      <Input
                        placeholder="Es. ABC123"
                        value={satispayToken}
                        onChange={(e) => setSatispayToken(e.target.value.toUpperCase())}
                        className="font-mono"
                        maxLength={8}
                      />
                      <Button
                        type="button"
                        variant="default"
                        onClick={activateSatispay}
                        disabled={satispayActivating || !satispayToken.trim()}
                        className="shrink-0"
                      >
                        {satispayActivating ? <Loader2 className="h-4 w-4 animate-spin" /> : "Attiva"}
                      </Button>
                    </div>
                    {satispayError && <p className="text-xs text-destructive">{satispayError}</p>}
                  </div>
                )}

                {/* Guida collassabile */}
                <details className="rounded-lg bg-amber-50 border border-amber-200">
                  <summary className="cursor-pointer px-3 py-2 text-sm font-medium text-amber-800 list-none flex items-center gap-2">
                    <span>📖</span> Come ottenere il codice di attivazione Satispay
                  </summary>
                  <div className="px-4 pb-4 pt-2 text-sm text-amber-900 space-y-2">
                    <ol className="list-decimal list-inside space-y-2">
                      <li>Apri l&apos;app <strong>Satispay Business</strong> sul tuo telefono</li>
                      <li>Vai su <strong>Impostazioni → Integrazione API</strong></li>
                      <li>Seleziona <strong>&quot;Ottieni codice di attivazione&quot;</strong></li>
                      <li>Appare un codice alfanumerico (es. ABC123) — inseriscilo qui sopra</li>
                      <li>Clicca <strong>Attiva</strong>: generiamo automaticamente le chiavi API e le colleghiamo al tuo account</li>
                    </ol>
                    <p className="mt-2 text-xs">
                      In alternativa puoi accedere al portale Business all&apos;indirizzo{" "}
                      <strong>business.satispay.com → Integrazioni</strong>.
                    </p>
                  </div>
                </details>
              </div>
            )}
          </div>

          {/* Revolut */}
          <div className="rounded-lg border p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-black/5">
                  <span className="text-sm font-black text-black">R</span>
                </div>
                <div>
                  <p className="font-medium">RevolutPay</p>
                  <p className="text-sm text-muted-foreground">Pagamento rapido con Revolut. I clienti vengono reindirizzati alla pagina di pagamento Revolut.</p>
                </div>
              </div>
              <label className="relative inline-flex cursor-pointer items-center">
                <input type="checkbox" className="peer sr-only"
                  checked={settings.payment_methods.revolut.enabled}
                  onChange={(e) => updatePaymentMethod("revolut", "enabled", e.target.checked)} />
                <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-brand-azure peer-checked:after:translate-x-full peer-checked:after:border-white" />
              </label>
            </div>
            {settings.payment_methods.revolut.enabled && (
              <div className="space-y-3">
                <div>
                  <label className="mb-1.5 block text-sm font-medium">API Key Revolut Merchant</label>
                  <Input
                    type="password"
                    placeholder="sk_live_..."
                    value={settings.payment_methods.revolut.api_key}
                    onChange={(e) => updatePaymentMethod("revolut", "api_key", e.target.value)}
                    className="font-mono text-sm"
                  />
                  {settings.payment_methods.revolut.api_key && (
                    <div className="mt-1 flex items-center gap-1 text-xs text-green-600">
                      <CheckCircle2 className="h-3 w-3" /> API Key configurata
                    </div>
                  )}
                </div>

                {/* Guida collassabile */}
                <details className="rounded-lg bg-blue-50 border border-blue-200">
                  <summary className="cursor-pointer px-3 py-2 text-sm font-medium text-blue-800 list-none flex items-center gap-2">
                    <span>📖</span> Come ottenere l&apos;API Key Revolut
                  </summary>
                  <div className="px-4 pb-4 pt-2 text-sm text-blue-900 space-y-2">
                    <ol className="list-decimal list-inside space-y-2">
                      <li>Accedi al portale <strong>Revolut Business</strong> su <strong>business.revolut.com</strong></li>
                      <li>Nel menu di sinistra vai su <strong>Merchant API → Impostazioni</strong></li>
                      <li>Clicca <strong>&quot;Crea nuova API Key&quot;</strong></li>
                      <li>Seleziona l&apos;ambiente <strong>Produzione</strong> e copia la chiave <code>sk_live_...</code></li>
                      <li>Incollala nel campo qui sopra e clicca <strong>Salva tutte le modifiche</strong></li>
                    </ol>
                    <p className="mt-2 text-xs font-medium">
                      Configura anche il webhook Revolut: URL → <code className="bg-blue-100 px-1 rounded">https://lido-facile.it/api/revolut/webhook</code>
                    </p>
                  </div>
                </details>
              </div>
            )}
          </div>

          {/* Bonifico */}
          <div className="rounded-lg border p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50">
                  <Building className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="font-medium">Bonifico bancario</p>
                  <p className="text-sm text-muted-foreground">Il cliente fa un bonifico prima dell&apos;arrivo.</p>
                </div>
              </div>
              <label className="relative inline-flex cursor-pointer items-center">
                <input type="checkbox" className="peer sr-only"
                  checked={settings.payment_methods.bonifico.enabled}
                  onChange={(e) => updatePaymentMethod("bonifico", "enabled", e.target.checked)} />
                <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-brand-azure peer-checked:after:translate-x-full peer-checked:after:border-white" />
              </label>
            </div>
            {settings.payment_methods.bonifico.enabled && (
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium">IBAN</label>
                  <Input placeholder="IT60 X054 2811 1010 0000 0123 456"
                    value={settings.payment_methods.bonifico.iban}
                    onChange={(e) => updatePaymentMethod("bonifico", "iban", e.target.value)} />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium">Intestato a</label>
                  <Input placeholder="Mario Rossi / Lido Bello srl"
                    value={settings.payment_methods.bonifico.intestatario}
                    onChange={(e) => updatePaymentMethod("bonifico", "intestatario", e.target.value)} />
                </div>
              </div>
            )}
          </div>

        </CardContent>
      </Card>

      {/* ── Google Maps ── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <MapPin className="h-5 w-5" />
            Google Maps
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium">Google Place ID</label>
              <Input placeholder="ChIJ..." value={settings.google_place_id} onChange={(e) => updateField("google_place_id", e.target.value)} />
              <p className="mt-1 text-xs text-muted-foreground">Trovi il Place ID cercando il tuo lido su Google Maps.</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium">Latitudine</label>
                <Input type="text" placeholder="41.9028" value={settings.latitude} onChange={(e) => updateField("latitude", e.target.value)} />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium">Longitudine</label>
                <Input type="text" placeholder="12.4964" value={settings.longitude} onChange={(e) => updateField("longitude", e.target.value)} />
              </div>
            </div>
          </div>
          <div className="rounded-lg border border-brand-azure/20 bg-brand-azure/5 p-4 space-y-3">
            <p className="text-sm font-medium">Link prenotazione per Google Maps</p>
            <div className="flex items-center gap-2">
              <Input readOnly value={`https://lido-facile.it/lido/${settings.slug}/prenota`} className="flex-1 bg-white text-sm" />
              <Button variant="outline" size="sm" onClick={() => { navigator.clipboard.writeText(`https://lido-facile.it/lido/${settings.slug}/prenota`); setCopied(true); setTimeout(() => setCopied(false), 2000); }}>
                {copied ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                {copied ? "Copiato!" : "Copia"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Pagina pubblica ── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Globe className="h-5 w-5" />
            La tua pagina pubblica
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <Input readOnly value={`${settings.slug}.lido-facile.it`} className="flex-1 bg-muted" />
            <Button variant="outline" asChild>
              <a href={`/lido/${settings.slug}`} target="_blank">
                <ExternalLink className="h-4 w-4" />
                Apri
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Bottone salva finale */}
      <div className="flex justify-end pb-6">
        <Button variant="brand" size="lg" onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : saved ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}
          {saved ? "Salvato!" : "Salva tutte le modifiche"}
        </Button>
      </div>
    </div>
  );
}

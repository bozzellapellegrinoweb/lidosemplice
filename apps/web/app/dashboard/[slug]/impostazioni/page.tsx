"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Save, Building2, Clock, Palette, CreditCard, Globe, ExternalLink,
  Loader2, Check, MapPin, Copy, CheckCircle2, Image as ImageIcon,
  Upload, X, Star, Sparkles,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { AMENITY_GROUPS, DEFAULT_AMENITIES, type AmenitiesData } from "@/lib/amenities";

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
  const containerRef = useRef<HTMLDivElement>(null);
  const initedRef = useRef(false);
  // Usiamo ref per evitare di reinizializzare quando cambiano le callback
  const onSelectRef = useRef(onSelect);
  const onChangeRef = useRef(onChange);
  useEffect(() => { onSelectRef.current = onSelect; }, [onSelect]);
  useEffect(() => { onChangeRef.current = onChange; }, [onChange]);

  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY;
    if (!apiKey) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async function doInit() {
      if (initedRef.current || !containerRef.current) return;
      initedRef.current = true;
      try {
        // Nuova API: PlaceAutocompleteElement (richiesta per account creati dopo marzo 2025)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { PlaceAutocompleteElement } = await (window.google.maps as any).importLibrary("places");
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const el = new PlaceAutocompleteElement({ componentRestrictions: { country: "it" } });
        containerRef.current.appendChild(el);

        el.addEventListener("gmp-select", async (e: Event) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const place = (e as any).placePrediction?.toPlace();
          if (!place) return;
          await place.fetchFields({ fields: ["addressComponents", "formattedAddress", "location", "id"] });
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const comps: any[] = place.addressComponents || [];
          const get = (type: string, short = false): string => {
            const c = comps.find((x) => x.types?.includes(type));
            return (short ? c?.shortText : c?.longText) || "";
          };
          const route = get("route");
          const num = get("street_number");
          const address = route ? `${route}${num ? ` ${num}` : ""}` : (place.formattedAddress || "");
          onChangeRef.current(address);
          onSelectRef.current({
            address,
            city: get("locality") || get("administrative_area_level_3"),
            province: get("administrative_area_level_2", true),
            cap: get("postal_code"),
            latitude: place.location?.lat().toString() || "",
            longitude: place.location?.lng().toString() || "",
            google_place_id: place.id || "",
          });
        });
      } catch (err) {
        console.error("PlaceAutocomplete init failed:", err);
        initedRef.current = false;
      }
    }

    // Se Maps è già caricato, init diretto
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((window.google?.maps as any)?.importLibrary) { doInit(); return; }

    // Se lo script è già in pagina, aspetta che finisca
    if (document.getElementById("gm-script")) {
      const iv = setInterval(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if ((window.google?.maps as any)?.importLibrary) { clearInterval(iv); doInit(); }
      }, 200);
      return () => clearInterval(iv);
    }

    // Carica lo script (nuovo pattern: loading=async, niente callback, niente libraries=)
    const script = document.createElement("script");
    script.id = "gm-script";
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&loading=async&language=it`;
    script.async = true;
    script.defer = true;
    script.onload = doInit;
    document.head.appendChild(script);
  }, []);

  return (
    <div className="space-y-1">
      {/* Input manuale per visualizzare/modificare il valore corrente */}
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Es. Via Roma 1, Rimini"
        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      />
      {/* PlaceAutocompleteElement viene montato qui e compila i campi alla selezione */}
      <div
        ref={containerRef}
        className="[&>gmp-placeautocomplete]:w-full [&>gmp-placeautocomplete]:block"
      />
    </div>
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

  const [settings, setSettings] = useState<EstablishmentSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [galleryUploading, setGalleryUploading] = useState(false);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("establishments")
        .select("id, name, slug, description, address, city, province, cap, phone, email, website, check_in_time, check_out_time, primary_color, secondary_color, paypal_email, paypal_enabled, google_place_id, latitude, longitude, logo_url, cover_image_url, gallery_photo_urls, amenities")
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
        paypal_email: settings.paypal_email || null,
        paypal_enabled: settings.paypal_enabled,
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
                <span className="whitespace-nowrap text-sm text-muted-foreground">.lidofacile.it</span>
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
            Metodi di pagamento
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div>
              <p className="font-medium">Stripe</p>
              <p className="text-sm text-muted-foreground">Carte di credito/debito.</p>
            </div>
            <Button variant="brand">
              <ExternalLink className="h-4 w-4" />
              Collega Stripe
            </Button>
          </div>
          <div className="rounded-lg border p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">PayPal</p>
                <p className="text-sm text-muted-foreground">Inserisci la tua email PayPal Business.</p>
              </div>
              <label className="relative inline-flex cursor-pointer items-center">
                <input type="checkbox" className="peer sr-only" checked={settings.paypal_enabled} onChange={(e) => setSettings({ ...settings, paypal_enabled: e.target.checked })} />
                <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-brand-azure peer-checked:after:translate-x-full peer-checked:after:border-white" />
              </label>
            </div>
            {settings.paypal_enabled && (
              <div>
                <label className="mb-1.5 block text-sm font-medium">Email PayPal Business</label>
                <Input type="email" placeholder="pagamenti@tuolido.it" value={settings.paypal_email} onChange={(e) => updateField("paypal_email", e.target.value)} />
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
              <Input readOnly value={`https://lidofacile.it/lido/${settings.slug}/prenota`} className="flex-1 bg-white text-sm" />
              <Button variant="outline" size="sm" onClick={() => { navigator.clipboard.writeText(`https://lidofacile.it/lido/${settings.slug}/prenota`); setCopied(true); setTimeout(() => setCopied(false), 2000); }}>
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
            <Input readOnly value={`${settings.slug}.lidofacile.it`} className="flex-1 bg-muted" />
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

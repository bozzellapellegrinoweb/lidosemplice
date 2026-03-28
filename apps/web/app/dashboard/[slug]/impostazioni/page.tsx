"use client";

import { useState } from "react";
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
} from "lucide-react";

export default function ImpostazioniPage() {
  const [settings, setSettings] = useState({
    name: "Lido Azzurro",
    slug: "lido-azzurro",
    description: "Il tuo angolo di paradiso sulla costa adriatica.",
    address: "Lungomare Cristoforo Colombo, 45",
    city: "Rimini",
    province: "RN",
    cap: "47921",
    phone: "+39 0541 123456",
    email: "info@lidoazzurro.it",
    website: "www.lidoazzurro.it",
    checkInTime: "08:00",
    checkOutTime: "19:00",
    primaryColor: "#00BFFF",
    secondaryColor: "#0B1829",
  });

  function updateField(field: string, value: string) {
    setSettings((prev) => ({ ...prev, [field]: value }));
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
        <Button variant="brand">
          <Save className="h-4 w-4" />
          Salva modifiche
        </Button>
      </div>

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
                <Input value={settings.slug} onChange={(e) => updateField("slug", e.target.value)} />
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
              <Input type="time" value={settings.checkInTime} onChange={(e) => updateField("checkInTime", e.target.value)} />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Chiusura (check-out)</label>
              <Input type="time" value={settings.checkOutTime} onChange={(e) => updateField("checkOutTime", e.target.value)} />
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
                  value={settings.primaryColor}
                  onChange={(e) => updateField("primaryColor", e.target.value)}
                  className="h-10 w-10 cursor-pointer rounded border"
                />
                <Input value={settings.primaryColor} onChange={(e) => updateField("primaryColor", e.target.value)} className="flex-1" />
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Colore secondario</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={settings.secondaryColor}
                  onChange={(e) => updateField("secondaryColor", e.target.value)}
                  className="h-10 w-10 cursor-pointer rounded border"
                />
                <Input value={settings.secondaryColor} onChange={(e) => updateField("secondaryColor", e.target.value)} className="flex-1" />
              </div>
            </div>
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            Questi colori verranno usati nella pagina pubblica del tuo stabilimento.
          </p>
        </CardContent>
      </Card>

      {/* Stripe */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <CreditCard className="h-5 w-5" />
            Pagamenti (Stripe)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div>
              <p className="font-medium">Stripe Connect</p>
              <p className="text-sm text-muted-foreground">
                Collega il tuo account Stripe per ricevere i pagamenti dai clienti.
              </p>
            </div>
            <Button variant="brand">
              <ExternalLink className="h-4 w-4" />
              Collega Stripe
            </Button>
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
            <Button variant="outline">
              <ExternalLink className="h-4 w-4" />
              Apri
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

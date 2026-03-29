import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, Globe, CreditCard, Mail, Database } from "lucide-react";

export default function AdminImpostazioni() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Impostazioni piattaforma</h1>
        <p className="text-muted-foreground">
          Configurazione globale di LidoFacile.it
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Globe className="h-5 w-5 text-brand-azure" />
              Dominio e DNS
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center justify-between rounded-lg border p-3">
              <span className="text-muted-foreground">Dominio principale</span>
              <span className="font-medium">lidofacile.it</span>
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <span className="text-muted-foreground">Wildcard DNS</span>
              <span className="font-medium">*.lidofacile.it</span>
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <span className="text-muted-foreground">Hosting</span>
              <span className="font-medium">Vercel</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <CreditCard className="h-5 w-5 text-brand-azure" />
              Stripe
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center justify-between rounded-lg border p-3">
              <span className="text-muted-foreground">Abbonamento</span>
              <span className="font-medium">597&euro;/anno</span>
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <span className="text-muted-foreground">Trial gratuito</span>
              <span className="font-medium">14 giorni</span>
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <span className="text-muted-foreground">Commissioni nostre</span>
              <span className="font-medium text-available">0% (zero)</span>
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <span className="text-muted-foreground">Connect type</span>
              <span className="font-medium">Express</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Database className="h-5 w-5 text-brand-azure" />
              Database
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center justify-between rounded-lg border p-3">
              <span className="text-muted-foreground">Provider</span>
              <span className="font-medium">Supabase (Postgres)</span>
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <span className="text-muted-foreground">Auth</span>
              <span className="font-medium">Supabase Auth</span>
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <span className="text-muted-foreground">Realtime</span>
              <span className="font-medium">Supabase Realtime</span>
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <span className="text-muted-foreground">RLS</span>
              <span className="font-medium text-available">Attivo</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Shield className="h-5 w-5 text-brand-azure" />
              Sicurezza
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center justify-between rounded-lg border p-3">
              <span className="text-muted-foreground">Email Super Admin</span>
              <span className="font-medium">info@lido-facile.it</span>
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <span className="text-muted-foreground">HTTPS</span>
              <span className="font-medium text-available">Forzato</span>
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <span className="text-muted-foreground">Row Level Security</span>
              <span className="font-medium text-available">Attivo</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

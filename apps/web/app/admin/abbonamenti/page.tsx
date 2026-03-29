import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  CreditCard,
  CheckCircle2,
  Clock,
  XCircle,
  Building2,
  Euro,
  TrendingUp,
  AlertTriangle,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";

const statusConfig: Record<
  string,
  { label: string; variant: "available" | "partial" | "occupied" | "outline"; icon: typeof CheckCircle2 }
> = {
  active: { label: "Attivo", variant: "available", icon: CheckCircle2 },
  trialing: { label: "Trial", variant: "partial", icon: Clock },
  past_due: { label: "Scaduto", variant: "occupied", icon: AlertTriangle },
  cancelled: { label: "Cancellato", variant: "outline", icon: XCircle },
  unpaid: { label: "Non pagato", variant: "occupied", icon: AlertTriangle },
};

export default async function AdminAbbonamenti() {
  const supabase = await createClient();

  // Abbonamenti con dati stabilimento
  const { data: subscriptions } = await supabase
    .from("platform_subscriptions")
    .select("*, establishments(name, slug, city)")
    .order("created_at", { ascending: false });

  const subs = subscriptions || [];
  const active = subs.filter((s) => s.status === "active");
  const trial = subs.filter((s) => s.status === "trialing");
  const pastDue = subs.filter((s) => s.status === "past_due" || s.status === "unpaid");

  const mrr = active.length * 4975; // 597/12 = 49.75
  const arr = active.length * 59700;

  const formatCurrency = (cents: number) =>
    (cents / 100).toLocaleString("it-IT", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Abbonamenti</h1>
        <p className="text-muted-foreground">
          Gestione abbonamenti e fatturato piattaforma.
        </p>
      </div>

      {/* Revenue cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-brand-cyan/20 bg-gradient-to-br from-brand-navy to-brand-navy-light text-white">
          <CardContent className="p-5">
            <p className="text-sm text-white/60">MRR</p>
            <p className="mt-1 text-3xl font-bold">{formatCurrency(mrr)}&euro;</p>
            <p className="mt-1 text-xs text-white/40">
              ARR: {formatCurrency(arr)}&euro;
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Attivi</p>
                <p className="mt-1 text-3xl font-bold text-available">
                  {active.length}
                </p>
              </div>
              <CheckCircle2 className="h-5 w-5 text-available" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">In trial</p>
                <p className="mt-1 text-3xl font-bold text-partial">
                  {trial.length}
                </p>
              </div>
              <Clock className="h-5 w-5 text-partial" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Problemi</p>
                <p className="mt-1 text-3xl font-bold text-occupied">
                  {pastDue.length}
                </p>
              </div>
              <AlertTriangle className="h-5 w-5 text-occupied" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lista abbonamenti */}
      <Card>
        <CardContent className="p-0">
          {subs.length === 0 ? (
            <div className="py-16 text-center">
              <CreditCard className="mx-auto h-12 w-12 text-muted-foreground/30" />
              <p className="mt-4 text-muted-foreground">
                Nessun abbonamento registrato.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="px-5 py-3 font-medium">Stabilimento</th>
                    <th className="px-5 py-3 font-medium">Piano</th>
                    <th className="px-5 py-3 font-medium">Stato</th>
                    <th className="px-5 py-3 font-medium">Inizio</th>
                    <th className="px-5 py-3 font-medium">Scadenza</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {subs.map((sub) => {
                    const est = sub.establishments as unknown as {
                      name: string;
                      slug: string;
                      city: string;
                    } | null;
                    const config = statusConfig[sub.status] || statusConfig.cancelled;
                    const StatusIcon = config.icon;

                    return (
                      <tr key={sub.id} className="hover:bg-muted/50">
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-azure/10">
                              <Building2 className="h-4 w-4 text-brand-azure" />
                            </div>
                            <div>
                              <p className="font-medium">
                                {est?.name || "Sconosciuto"}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {est?.city || "—"}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3">
                          <span className="font-medium">597&euro;/anno</span>
                        </td>
                        <td className="px-5 py-3">
                          <Badge variant={config.variant} className="gap-1">
                            <StatusIcon className="h-3 w-3" />
                            {config.label}
                          </Badge>
                        </td>
                        <td className="px-5 py-3 text-muted-foreground">
                          {sub.start_date
                            ? new Date(sub.start_date).toLocaleDateString("it-IT")
                            : "—"}
                        </td>
                        <td className="px-5 py-3 text-muted-foreground">
                          {sub.current_period_end
                            ? new Date(
                                sub.current_period_end
                              ).toLocaleDateString("it-IT")
                            : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

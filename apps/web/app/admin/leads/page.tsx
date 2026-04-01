"use client";

import { useEffect, useState, useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  MapPin,
  RefreshCw,
  ExternalLink,
  CheckCircle2,
  Loader2,
  XCircle,
  Clock,
  Database,
  Play,
} from "lucide-react";
import { COMUNI_COSTIERI } from "@/lib/comuni-costieri";

interface ApifyRun {
  id: string;
  status: string;
  startedAt: string;
  finishedAt: string | null;
  stats?: { itemCount?: number };
}

interface DatasetInfo {
  itemCount: number;
}

export default function AdminLeadsPage() {
  const [runs, setRuns] = useState<ApifyRun[]>([]);
  const [dataset, setDataset] = useState<DatasetInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [triggerMsg, setTriggerMsg] = useState<string | null>(null);

  const fetchStatus = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = process.env.NEXT_PUBLIC_APIFY_TOKEN;
      // Le chiamate Apify vengono fatte server-side tramite la nostra API
      const res = await fetch("/api/leads/status");
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setRuns(data.runs ?? []);
      setDataset(data.dataset ?? null);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const handleTrigger = () => {
    setTriggerMsg(null);
    startTransition(async () => {
      try {
        const res = await fetch("/api/leads/trigger", { method: "POST" });
        const data = await res.json();
        if (!res.ok) {
          setTriggerMsg(`Errore: ${data.error}`);
        } else {
          setTriggerMsg(`Run avviato! ID: ${data.runId}`);
          setTimeout(fetchStatus, 3000);
        }
      } catch (e) {
        setTriggerMsg(`Errore: ${e}`);
      }
    });
  };

  const lastRun = runs[0] ?? null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Lead Generation</h1>
          <p className="text-muted-foreground">
            Scraping automatico di stabilimenti balneari su Google Maps ({COMUNI_COSTIERI.length} comuni costieri)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchStatus} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Aggiorna
          </Button>
          <Button onClick={handleTrigger} disabled={isPending} className="gap-2">
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Play className="h-4 w-4" />
            )}
            Avvia ora
          </Button>
        </div>
      </div>

      {triggerMsg && (
        <div className={`rounded-lg border px-4 py-3 text-sm ${triggerMsg.startsWith("Errore") ? "border-red-200 bg-red-50 text-red-700" : "border-green-200 bg-green-50 text-green-700"}`}>
          {triggerMsg}
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Cards KPI */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Leads nel dataset</p>
                <p className="mt-1 text-3xl font-bold">
                  {dataset ? dataset.itemCount.toLocaleString("it-IT") : "—"}
                </p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-azure/10">
                <Database className="h-6 w-6 text-brand-azure" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Comuni analizzati</p>
                <p className="mt-1 text-3xl font-bold">{COMUNI_COSTIERI.length}</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-azure/10">
                <MapPin className="h-6 w-6 text-brand-azure" />
              </div>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">20 risultati per comune</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Ultimo run</p>
                <p className="mt-1 text-lg font-semibold">
                  {lastRun
                    ? new Date(lastRun.startedAt).toLocaleDateString("it-IT", {
                        day: "2-digit",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : "Mai eseguito"}
                </p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-azure/10">
                <Clock className="h-6 w-6 text-brand-azure" />
              </div>
            </div>
            {lastRun && (
              <div className="mt-2">
                <RunStatusBadge status={lastRun.status} />
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Info integrazione Google Sheets */}
      <Card className="border-brand-cyan/30 bg-brand-navy/5">
        <CardContent className="p-5">
          <div className="flex items-start gap-3">
            <ExternalLink className="mt-0.5 h-5 w-5 shrink-0 text-brand-azure" />
            <div className="space-y-1">
              <p className="font-medium">Integrazione Google Sheets</p>
              <p className="text-sm text-muted-foreground">
                Il dataset <strong>lidofacile-leads</strong> su Apify viene aggiornato ogni giorno alle 03:00.
                Per collegarlo a Google Sheets vai su{" "}
                <a
                  href="https://console.apify.com/storage/datasets"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-brand-azure underline"
                >
                  Apify → Storage → Datasets
                </a>
                , apri <strong>lidofacile-leads</strong> e clicca <strong>Integrations → Google Sheets</strong>.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Storico run */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Storico run</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : runs.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              Nessun run trovato. Clicca &quot;Avvia ora&quot; per iniziare il primo scraping.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="px-5 py-3 font-medium">ID Run</th>
                    <th className="px-5 py-3 font-medium">Avviato</th>
                    <th className="px-5 py-3 font-medium">Terminato</th>
                    <th className="px-5 py-3 font-medium">Leads</th>
                    <th className="px-5 py-3 font-medium">Stato</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {runs.map((run) => (
                    <tr key={run.id} className="hover:bg-muted/50">
                      <td className="px-5 py-3 font-mono text-xs text-muted-foreground">
                        {run.id.slice(0, 8)}…
                      </td>
                      <td className="px-5 py-3">
                        {new Date(run.startedAt).toLocaleDateString("it-IT", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="px-5 py-3 text-muted-foreground">
                        {run.finishedAt
                          ? new Date(run.finishedAt).toLocaleDateString("it-IT", {
                              day: "2-digit",
                              month: "short",
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "—"}
                      </td>
                      <td className="px-5 py-3 font-medium">
                        {run.stats?.itemCount?.toLocaleString("it-IT") ?? "—"}
                      </td>
                      <td className="px-5 py-3">
                        <RunStatusBadge status={run.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function RunStatusBadge({ status }: { status: string }) {
  switch (status) {
    case "SUCCEEDED":
      return (
        <Badge variant="available" className="gap-1">
          <CheckCircle2 className="h-3 w-3" />
          Completato
        </Badge>
      );
    case "RUNNING":
      return (
        <Badge variant="partial" className="gap-1">
          <Loader2 className="h-3 w-3 animate-spin" />
          In corso
        </Badge>
      );
    case "FAILED":
    case "ABORTED":
      return (
        <Badge variant="occupied" className="gap-1">
          <XCircle className="h-3 w-3" />
          Fallito
        </Badge>
      );
    default:
      return (
        <Badge variant="outline" className="gap-1">
          <Clock className="h-3 w-3" />
          {status}
        </Badge>
      );
  }
}

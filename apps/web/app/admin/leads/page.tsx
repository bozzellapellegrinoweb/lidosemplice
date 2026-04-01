"use client";

import { useEffect, useState, useTransition, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  MapPin,
  RefreshCw,
  CheckCircle2,
  Loader2,
  XCircle,
  Clock,
  Database,
  Play,
  Download,
  Search,
  Mail,
  Globe,
  Phone,
} from "lucide-react";
import { COMUNI_COSTIERI } from "@/lib/comuni-costieri";

interface Lead {
  id: string;
  scraped_at: string;
  nome: string | null;
  citta: string | null;
  cap: string | null;
  indirizzo: string | null;
  telefono: string | null;
  email: string | null;
  sito_web: string | null;
  rating: number | null;
  recensioni: number | null;
  categoria: string | null;
  google_maps_url: string | null;
}

interface ApifyRun {
  id: string;
  status: string;
  startedAt: string;
  finishedAt: string | null;
  stats?: { itemCount?: number };
}

export default function AdminLeadsPage() {
  // Scraper status
  const [runs, setRuns] = useState<ApifyRun[]>([]);
  const [statusLoading, setStatusLoading] = useState(true);
  const [triggerMsg, setTriggerMsg] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Leads table
  const [leads, setLeads] = useState<Lead[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [leadsLoading, setLeadsLoading] = useState(true);
  const [leadsError, setLeadsError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [draftSearch, setDraftSearch] = useState("");

  const pageSize = 50;
  const totalPages = Math.ceil(totalCount / pageSize);

  // ---------- Apify status ----------
  const fetchStatus = useCallback(async () => {
    setStatusLoading(true);
    try {
      const res = await fetch("/api/leads/status");
      const data = await res.json();
      setRuns(data.runs ?? []);
    } finally {
      setStatusLoading(false);
    }
  }, []);

  // ---------- Leads ----------
  const fetchLeads = useCallback(async (p: number, q: string, from: string, to: string) => {
    setLeadsLoading(true);
    setLeadsError(null);
    try {
      const params = new URLSearchParams({ page: String(p) });
      if (q) params.set("q", q);
      if (from) params.set("from", from);
      if (to) params.set("to", to);
      const res = await fetch(`/api/leads/list?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Errore");
      setLeads(data.data ?? []);
      setTotalCount(data.count ?? 0);
    } catch (e) {
      setLeadsError(String(e));
    } finally {
      setLeadsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  useEffect(() => {
    fetchLeads(page, search, dateFrom, dateTo);
  }, [page, search, dateFrom, dateTo, fetchLeads]);

  const applySearch = () => {
    setSearch(draftSearch);
    setPage(1);
  };

  const resetFilters = () => {
    setDraftSearch("");
    setSearch("");
    setDateFrom("");
    setDateTo("");
    setPage(1);
  };

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

  const handleExport = () => {
    const params = new URLSearchParams();
    if (search) params.set("q", search);
    if (dateFrom) params.set("from", dateFrom);
    if (dateTo) params.set("to", dateTo);
    window.location.href = `/api/leads/export?${params}`;
  };

  const lastRun = runs[0] ?? null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Lead Generation</h1>
          <p className="text-muted-foreground">
            {totalCount.toLocaleString("it-IT")} stabilimenti balneari · {COMUNI_COSTIERI.length} comuni costieri
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchStatus} disabled={statusLoading}>
            <RefreshCw className={`h-4 w-4 ${statusLoading ? "animate-spin" : ""}`} />
            Aggiorna
          </Button>
          <Button onClick={handleTrigger} disabled={isPending} size="sm" className="gap-2">
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
            Avvia scraping
          </Button>
        </div>
      </div>

      {triggerMsg && (
        <div className={`rounded-lg border px-4 py-3 text-sm ${triggerMsg.startsWith("Errore") ? "border-red-200 bg-red-50 text-red-700" : "border-green-200 bg-green-50 text-green-700"}`}>
          {triggerMsg}
        </div>
      )}

      {/* KPI cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Leads salvati</p>
                <p className="mt-1 text-3xl font-bold">{totalCount.toLocaleString("it-IT")}</p>
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

      {/* Filtri + Export */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex min-w-[240px] flex-1 items-center gap-2">
              <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
              <Input
                placeholder="Cerca nome, città, categoria, email…"
                value={draftSearch}
                onChange={(e) => setDraftSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && applySearch()}
                className="h-9"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground whitespace-nowrap">Dal</span>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
                className="h-9 w-36"
              />
              <span className="text-sm text-muted-foreground">al</span>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
                className="h-9 w-36"
              />
            </div>
            <Button size="sm" onClick={applySearch} className="gap-1">
              <Search className="h-4 w-4" />
              Cerca
            </Button>
            {(search || dateFrom || dateTo) && (
              <Button size="sm" variant="outline" onClick={resetFilters}>
                Reset
              </Button>
            )}
            <div className="ml-auto">
              <Button size="sm" variant="outline" onClick={handleExport} className="gap-2">
                <Download className="h-4 w-4" />
                Esporta CSV
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabella leads */}
      <Card>
        <CardHeader className="pb-0">
          <CardTitle className="text-base">
            {search || dateFrom || dateTo
              ? `${totalCount.toLocaleString("it-IT")} risultati filtrati`
              : `Tutti i leads · pagina ${page} di ${totalPages || 1}`}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0 pt-3">
          {leadsError && (
            <div className="mx-5 mb-3 rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {leadsError}
            </div>
          )}
          {leadsLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : leads.length === 0 ? (
            <div className="py-16 text-center text-sm text-muted-foreground">
              {totalCount === 0
                ? "Nessun lead ancora. Clicca \"Avvia scraping\" per iniziare."
                : "Nessun risultato per i filtri selezionati."}
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-xs text-muted-foreground">
                      <th className="px-4 py-3 font-medium">Nome</th>
                      <th className="px-4 py-3 font-medium">Città</th>
                      <th className="px-4 py-3 font-medium">Categoria</th>
                      <th className="px-4 py-3 font-medium">Telefono</th>
                      <th className="px-4 py-3 font-medium">Email</th>
                      <th className="px-4 py-3 font-medium">Sito</th>
                      <th className="px-4 py-3 font-medium text-right">Rating</th>
                      <th className="px-4 py-3 font-medium text-right">Rec.</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {leads.map((lead) => (
                      <tr key={lead.id} className="hover:bg-muted/30">
                        <td className="px-4 py-2.5 font-medium max-w-[200px]">
                          <div className="truncate" title={lead.nome ?? ""}>
                            {lead.google_maps_url ? (
                              <a
                                href={lead.google_maps_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="hover:text-brand-azure hover:underline"
                              >
                                {lead.nome || "—"}
                              </a>
                            ) : (
                              lead.nome || "—"
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-2.5 text-muted-foreground whitespace-nowrap">
                          {lead.citta || "—"} {lead.cap ? `(${lead.cap})` : ""}
                        </td>
                        <td className="px-4 py-2.5 max-w-[160px]">
                          <div className="truncate text-xs text-muted-foreground" title={lead.categoria ?? ""}>
                            {lead.categoria || "—"}
                          </div>
                        </td>
                        <td className="px-4 py-2.5 whitespace-nowrap">
                          {lead.telefono ? (
                            <a
                              href={`tel:${lead.telefono}`}
                              className="flex items-center gap-1 text-muted-foreground hover:text-foreground"
                            >
                              <Phone className="h-3 w-3" />
                              {lead.telefono}
                            </a>
                          ) : (
                            <span className="text-muted-foreground/50">—</span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 max-w-[200px]">
                          {lead.email ? (
                            <a
                              href={`mailto:${lead.email.split(",")[0].trim()}`}
                              className="flex items-center gap-1 truncate text-brand-azure hover:underline"
                              title={lead.email}
                            >
                              <Mail className="h-3 w-3 shrink-0" />
                              <span className="truncate">{lead.email}</span>
                            </a>
                          ) : (
                            <span className="text-muted-foreground/50">—</span>
                          )}
                        </td>
                        <td className="px-4 py-2.5">
                          {lead.sito_web ? (
                            <a
                              href={lead.sito_web}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 text-muted-foreground hover:text-foreground"
                            >
                              <Globe className="h-3 w-3 shrink-0" />
                              <span className="max-w-[120px] truncate text-xs">
                                {lead.sito_web.replace(/^https?:\/\//, "").replace(/\/$/, "")}
                              </span>
                            </a>
                          ) : (
                            <span className="text-muted-foreground/50">—</span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-right tabular-nums">
                          {lead.rating != null ? (
                            <span className="font-medium">{Number(lead.rating).toFixed(1)}</span>
                          ) : (
                            <span className="text-muted-foreground/50">—</span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground">
                          {lead.recensioni?.toLocaleString("it-IT") ?? "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Paginazione */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between border-t px-4 py-3">
                  <p className="text-sm text-muted-foreground">
                    {((page - 1) * pageSize + 1).toLocaleString("it-IT")}–
                    {Math.min(page * pageSize, totalCount).toLocaleString("it-IT")} di{" "}
                    {totalCount.toLocaleString("it-IT")}
                  </p>
                  <div className="flex items-center gap-1">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={page <= 1 || leadsLoading}
                      onClick={() => setPage((p) => p - 1)}
                    >
                      ← Prec
                    </Button>
                    <span className="px-3 text-sm">
                      {page} / {totalPages}
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={page >= totalPages || leadsLoading}
                      onClick={() => setPage((p) => p + 1)}
                    >
                      Succ →
                    </Button>
                  </div>
                </div>
              )}
            </>
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

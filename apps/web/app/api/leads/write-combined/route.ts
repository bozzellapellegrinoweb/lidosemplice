/**
 * POST /api/leads/write-combined
 * Chiamato dal webhook Apify quando l'email scraper termina.
 * Legge il dataset Maps (ultimo run) + dataset email, li unisce e li salva su Supabase.
 */
import { createClient } from "@supabase/supabase-js";

export async function POST(req: Request) {
  const { searchParams } = new URL(req.url);
  const secret = searchParams.get("secret");

  if (secret !== process.env.CRON_SECRET) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const emailDatasetId: string | undefined =
    body?.resource?.defaultDatasetId ?? body?.datasetId;

  if (!emailDatasetId) {
    return Response.json({ error: "emailDatasetId mancante" }, { status: 400 });
  }

  const apifyToken = process.env.APIFY_API_TOKEN!;
  const headers = { Authorization: `Bearer ${apifyToken}` };

  // 1. Trova il dataset del run Maps più recente
  const mapsRunsRes = await fetch(
    "https://api.apify.com/v2/acts/nwua9Gu5YrADL7ZDj/runs?limit=1&desc=true",
    { headers }
  );
  const mapsRuns = await mapsRunsRes.json();
  const mapsDatasetId = mapsRuns?.data?.items?.[0]?.defaultDatasetId;
  if (!mapsDatasetId) {
    return Response.json({ error: "Nessun run Maps trovato" }, { status: 500 });
  }

  // 2. Leggi tutti i leads dal dataset Maps
  const mapsRes = await fetch(
    `https://api.apify.com/v2/datasets/${mapsDatasetId}/items?limit=5000`,
    { headers }
  );
  const leads: Record<string, unknown>[] = await mapsRes.json();

  // 3. Leggi le email dal dataset email scraper
  const emailRes = await fetch(
    `https://api.apify.com/v2/datasets/${emailDatasetId}/items?limit=5000`,
    { headers }
  );
  const emailItems: { subType?: string; url?: string; sourceUrl?: string }[] =
    await emailRes.json();

  // 4. Costruisci mappa website → email
  const emailMap: Record<string, string[]> = {};
  for (const item of emailItems) {
    if (item.subType === "email" && item.url && item.sourceUrl) {
      const site = item.sourceUrl;
      if (!emailMap[site]) emailMap[site] = [];
      if (!emailMap[site].includes(item.url)) emailMap[site].push(item.url);
    }
  }

  // 5. Unisci leads + email
  const now = new Date().toISOString();
  const rows = leads.map((lead) => {
    const site = (lead.website as string) || "";
    const emails = emailMap[site] || [];
    return {
      scraped_at: now,
      nome: (lead.title as string) || null,
      indirizzo: (lead.address as string) || null,
      citta: (lead.city as string) || null,
      cap: (lead.postalCode as string) || null,
      telefono: lead.phone ? String(lead.phone) : null,
      email: emails.length > 0 ? emails.join(", ") : null,
      sito_web: site || null,
      rating: (lead.totalScore as number) || null,
      recensioni: (lead.reviewsCount as number) || null,
      categoria: (lead.categoryName as string) || null,
      google_maps_url: (lead.url as string) || null,
    };
  });

  // 6. Scrivi su Supabase (service role — bypass RLS)
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Svuota la tabella prima di ogni run (dati sempre freschi, niente duplicati)
  const { error: truncateError } = await supabase.from("leads").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  if (truncateError) {
    return Response.json({ error: `Errore svuotamento: ${truncateError.message}` }, { status: 500 });
  }

  // Inserisci in batch da 500
  const BATCH = 500;
  let inserted = 0;
  for (let i = 0; i < rows.length; i += BATCH) {
    const { error } = await supabase.from("leads").insert(rows.slice(i, i + BATCH));
    if (error) {
      return Response.json({ error: `Errore inserimento: ${error.message}` }, { status: 500 });
    }
    inserted += rows.slice(i, i + BATCH).length;
  }

  return Response.json({
    ok: true,
    inserted,
    emailsMatched: rows.filter((r) => r.email).length,
  });
}

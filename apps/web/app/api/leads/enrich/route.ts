/**
 * POST /api/leads/enrich
 * Chiamato dal webhook Apify quando il run Google Maps Scraper termina.
 * Legge i siti web dal dataset e avvia il Website Emails Scraper.
 */
export async function POST(req: Request) {
  const { searchParams } = new URL(req.url);
  const secret = searchParams.get("secret");

  if (secret !== process.env.CRON_SECRET) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const datasetId: string | undefined =
    body?.resource?.defaultDatasetId ?? body?.datasetId;

  if (!datasetId) {
    return Response.json({ error: "datasetId mancante" }, { status: 400 });
  }

  const apifyToken = process.env.APIFY_API_TOKEN!;

  // Leggi tutti gli items dal dataset Google Maps
  const itemsRes = await fetch(
    `https://api.apify.com/v2/datasets/${datasetId}/items?limit=2000&fields=website`,
    { headers: { Authorization: `Bearer ${apifyToken}` } }
  );

  if (!itemsRes.ok) {
    return Response.json({ error: "Errore lettura dataset" }, { status: 500 });
  }

  const items: { website?: string }[] = await itemsRes.json();

  // Estrai URL unici con sito web
  const urls = [...new Set(
    items
      .map((i) => i.website)
      .filter((url): url is string => !!url && url.startsWith("http"))
  )].map((url) => ({ url }));

  if (urls.length === 0) {
    return Response.json({ ok: true, message: "Nessun sito web trovato" });
  }

  // Avvia Website Emails Scraper
  const runRes = await fetch(
    "https://api.apify.com/v2/acts/3C5pf0e2XqFhVcSSj/runs?waitForFinish=0",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apifyToken}`,
      },
      body: JSON.stringify({
        startUrls: urls,
        maxDepth: 1,
        maxPagesPerDomain: 3,
        sameDomain: true,
      }),
    }
  );

  if (!runRes.ok) {
    return Response.json({ error: "Errore avvio email scraper" }, { status: 500 });
  }

  const runData = await runRes.json();
  return Response.json({
    ok: true,
    emailRunId: runData.data?.id,
    urlsQueued: urls.length,
  });
}

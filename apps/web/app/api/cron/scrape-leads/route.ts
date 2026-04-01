import { COMUNI_COSTIERI } from "@/lib/comuni-costieri";

/**
 * GET /api/cron/scrape-leads
 * Vercel Cron Job — gira ogni giorno alle 03:00.
 * Avvia un run dell'actor Apify "Google Maps Scraper" per tutti i comuni costieri italiani.
 */
export async function GET(req: Request) {
  const cronSecret = req.headers.get("authorization")?.replace("Bearer ", "");
  if (cronSecret !== process.env.CRON_SECRET) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apifyToken = process.env.APIFY_API_TOKEN;
  if (!apifyToken) {
    return Response.json({ error: "APIFY_API_TOKEN non configurato" }, { status: 500 });
  }

  const result = await startApifyRun(apifyToken);

  if (!result.ok) {
    return Response.json({ error: result.error }, { status: 500 });
  }

  return Response.json({
    ok: true,
    runId: result.runId,
    message: `Run Apify avviato con ${COMUNI_COSTIERI.length} query`,
  });
}

export async function startApifyRun(apifyToken: string): Promise<{ ok: true; runId: string } | { ok: false; error: string }> {
  const searchQueries = COMUNI_COSTIERI.map((c) => `stabilimento balneare ${c}`);

  try {
    const res = await fetch(
      "https://api.apify.com/v2/acts/nwua9Gu5YrADL7ZDj/runs?waitForFinish=0",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apifyToken}`,
        },
        body: JSON.stringify({
          searchStringsArray: searchQueries,
          maxCrawledPlacesPerSearch: 20,
          language: "it",
          countryCode: "it",
          includeHistogram: false,
          includeOpeningHours: false,
          includePeopleAlsoSearch: false,
          outputNamedDataset: "lidofacile-leads",
          scrapeDirectories: false,
        }),
      }
    );

    if (!res.ok) {
      const text = await res.text();
      return { ok: false, error: `Apify API error ${res.status}: ${text}` };
    }

    const data = await res.json();
    return { ok: true, runId: data.data?.id ?? "unknown" };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}

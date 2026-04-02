import { COMUNI_COSTIERI } from "@/lib/comuni-costieri";

const BATCH_SIZE = 10; // ~100 leads/run (10 comuni × max 10 risultati)

export async function startApifyRun(
  apifyToken: string
): Promise<{ ok: true; runId: string } | { ok: false; error: string }> {
  // Rotazione giornaliera: ogni giorno scrapa il batch successivo
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
  const numBatches = Math.ceil(COMUNI_COSTIERI.length / BATCH_SIZE);
  const batchIndex = dayOfYear % numBatches;
  const start = batchIndex * BATCH_SIZE;
  const batch = COMUNI_COSTIERI.slice(start, start + BATCH_SIZE);

  const searchQueries = batch.map((c) => `stabilimento balneare ${c}`);

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
          maxCrawledPlacesPerSearch: 10,
          language: "it",
          countryCode: "it",
          includeHistogram: false,
          includeOpeningHours: false,
          includePeopleAlsoSearch: false,
          scrapeContacts: false,
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

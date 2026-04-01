import { COMUNI_COSTIERI } from "@/lib/comuni-costieri";

export async function startApifyRun(
  apifyToken: string
): Promise<{ ok: true; runId: string } | { ok: false; error: string }> {
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
          scrapeContacts: true,
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

/**
 * POST /api/leads/write-combined
 * Chiamato dal webhook Apify quando il Google Maps Scraper termina.
 * Legge il dataset Maps e salva i leads su Supabase.
 */
import { createClient } from "@supabase/supabase-js";

export async function POST(req: Request) {
  const { searchParams } = new URL(req.url);
  const secret = searchParams.get("secret");

  if (secret !== process.env.CRON_SECRET) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const mapsDatasetId: string | undefined =
    body?.resource?.defaultDatasetId ?? body?.datasetId;

  if (!mapsDatasetId) {
    return Response.json({ error: "datasetId mancante" }, { status: 400 });
  }

  const apifyToken = process.env.APIFY_API_TOKEN!;
  const headers = { Authorization: `Bearer ${apifyToken}` };

  // Leggi tutti i leads dal dataset Maps
  const mapsRes = await fetch(
    `https://api.apify.com/v2/datasets/${mapsDatasetId}/items?limit=5000`,
    { headers }
  );
  const leads: Record<string, unknown>[] = await mapsRes.json();

  if (!Array.isArray(leads) || leads.length === 0) {
    return Response.json({ error: "Dataset Maps vuoto" }, { status: 400 });
  }

  // Prepara le righe
  const now = new Date().toISOString();
  const rows = leads.map((lead) => ({
    scraped_at: now,
    nome: (lead.title as string) || null,
    indirizzo: (lead.address as string) || null,
    citta: (lead.city as string) || null,
    cap: (lead.postalCode as string) || null,
    telefono: lead.phone ? String(lead.phone) : null,
    email: null,
    sito_web: (lead.website as string) || null,
    rating: (lead.totalScore as number) || null,
    recensioni: (lead.reviewsCount as number) || null,
    categoria: (lead.categoryName as string) || null,
    google_maps_url: (lead.url as string) || null,
  }));

  // Scrivi su Supabase (service role — bypass RLS)
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Upsert per google_maps_url — accumula senza duplicati
  const BATCH = 500;
  let inserted = 0;
  for (let i = 0; i < rows.length; i += BATCH) {
    const { error } = await supabase.from("leads").upsert(
      rows.slice(i, i + BATCH),
      { onConflict: "google_maps_url", ignoreDuplicates: false }
    );
    if (error) {
      return Response.json({ error: `Errore upsert: ${error.message}` }, { status: 500 });
    }
    inserted += rows.slice(i, i + BATCH).length;
  }

  return Response.json({ ok: true, inserted });
}

import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/leads/status
 * Restituisce gli ultimi run Apify e le info sul dataset lidofacile-leads.
 * Solo super admin.
 */
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: "Non autenticato" }, { status: 401 });
  }

  const superAdminEmails = (process.env.SUPER_ADMIN_EMAILS || "").split(",").map((e) => e.trim());
  if (!superAdminEmails.includes(user.email ?? "")) {
    return Response.json({ error: "Accesso non autorizzato" }, { status: 403 });
  }

  const apifyToken = process.env.APIFY_API_TOKEN;
  if (!apifyToken) {
    return Response.json({ error: "APIFY_API_TOKEN non configurato" }, { status: 500 });
  }

  const headers = { Authorization: `Bearer ${apifyToken}` };

  // Ultimi 10 run dell'actor
  const [runsRes, datasetRes] = await Promise.all([
    fetch(
      "https://api.apify.com/v2/acts/nwua9Gu5YrADL7ZDj/runs?limit=10&desc=true",
      { headers }
    ),
    fetch(
      "https://api.apify.com/v2/datasets/lidofacile-leads",
      { headers }
    ),
  ]);

  const runs = runsRes.ok ? (await runsRes.json()).data?.items ?? [] : [];
  const datasetData = datasetRes.ok ? await datasetRes.json() : null;

  return Response.json({
    runs: runs.map((r: Record<string, unknown>) => ({
      id: r.id,
      status: r.status,
      startedAt: r.startedAt,
      finishedAt: r.finishedAt ?? null,
      stats: r.stats,
    })),
    dataset: datasetData
      ? { itemCount: datasetData.data?.itemCount ?? 0 }
      : null,
  });
}

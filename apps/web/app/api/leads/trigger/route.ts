import { createClient } from "@/lib/supabase/server";
import { startApifyRun } from "@/app/api/cron/scrape-leads/route";

/**
 * POST /api/leads/trigger
 * Trigger manuale del run Apify dall'area admin.
 * Solo super admin.
 */
export async function POST() {
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

  const result = await startApifyRun(apifyToken);

  if (!result.ok) {
    return Response.json({ error: result.error }, { status: 500 });
  }

  return Response.json({ ok: true, runId: result.runId });
}

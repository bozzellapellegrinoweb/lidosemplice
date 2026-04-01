import { startApifyRun } from "@/lib/apify";
import { COMUNI_COSTIERI } from "@/lib/comuni-costieri";

/**
 * GET /api/cron/scrape-leads
 * Vercel Cron Job — gira ogni giorno alle 03:00.
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

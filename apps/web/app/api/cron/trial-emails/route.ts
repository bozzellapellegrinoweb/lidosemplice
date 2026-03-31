import { createClient } from "@supabase/supabase-js";

function adminSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

// Protezione: solo Vercel Cron può chiamare questo endpoint
function isAuthorized(request: Request): boolean {
  const authHeader = request.headers.get("authorization");
  return authHeader === `Bearer ${process.env.CRON_SECRET}`;
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return Response.json({ error: "Non autorizzato" }, { status: 401 });
  }

  const db = adminSupabase();
  const now = new Date();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://lido-facile.it";

  // Trova tutti gli stabilimenti in trial attivo
  const { data: trials } = await db
    .from("establishments")
    .select(`
      id, slug, name, subscription_expires_at,
      owner_id,
      user_profiles!owner_id(full_name, email:id)
    `)
    .eq("subscription_status", "trial")
    .not("subscription_expires_at", "is", null);

  if (!trials?.length) {
    return Response.json({ processed: 0 });
  }

  let sent = 0;

  for (const est of trials) {
    const expiresAt = new Date(est.subscription_expires_at);
    const diffMs = expiresAt.getTime() - now.getTime();
    const daysLeft = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    // Recupera email del proprietario tramite Supabase Auth
    const { data: userData } = await db.auth.admin.getUserById(est.owner_id);
    const email = userData?.user?.email;
    const fullName = (userData?.user?.user_metadata?.full_name as string) ?? "";

    if (!email) continue;

    const payload = {
      email,
      full_name: fullName,
      establishment_name: est.name,
      slug: est.slug,
    };

    if (daysLeft === 7 || daysLeft === 1) {
      // Reminder a 7 giorni e all'ultimo giorno
      await fetch(`${appUrl}/api/email/trial-reminder`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, days_left: daysLeft }),
      });
      sent++;
    } else if (daysLeft <= 0) {
      // Scaduto oggi (0 o negativo)
      await fetch(`${appUrl}/api/email/trial-scaduto`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      // Aggiorna status a expired
      await db.from("establishments").update({
        subscription_status: "expired",
      }).eq("id", est.id);

      sent++;
    }
  }

  return Response.json({ processed: trials.length, sent });
}

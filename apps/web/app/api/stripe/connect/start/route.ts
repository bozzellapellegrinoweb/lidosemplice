import Stripe from "stripe";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const establishmentId = searchParams.get("id");
  const slug = searchParams.get("slug");

  if (!establishmentId || !slug) {
    return Response.json({ error: "Parametri mancanti" }, { status: 400 });
  }

  if (!process.env.STRIPE_SECRET_KEY) {
    return Response.json({ error: "STRIPE_SECRET_KEY non configurata" }, { status: 503 });
  }

  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://lido-facile.it";

    const accountId = await getOrCreateStripeAccount(stripe, establishmentId);

    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${appUrl}/dashboard/${slug}/impostazioni?stripe_error=1`,
      return_url: `${appUrl}/api/stripe/connect/callback?id=${establishmentId}&slug=${slug}`,
      type: "account_onboarding",
    });

    return Response.redirect(accountLink.url);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Errore sconosciuto";
    console.error("Stripe Connect error:", message);
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://lido-facile.it";
    return Response.redirect(
      `${appUrl}/dashboard/${slug}/impostazioni?stripe_error=1&msg=${encodeURIComponent(message)}`
    );
  }
}

async function getOrCreateStripeAccount(stripe: Stripe, establishmentId: string): Promise<string> {
  const { createClient } = await import("@supabase/supabase-js");
  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const { data } = await db
    .from("establishments")
    .select("stripe_account_id")
    .eq("id", establishmentId)
    .single();

  if (data?.stripe_account_id) return data.stripe_account_id;

  const account = await stripe.accounts.create({ type: "express", country: "IT" });

  await db.from("establishments").update({
    stripe_account_id: account.id,
  }).eq("id", establishmentId);

  return account.id;
}

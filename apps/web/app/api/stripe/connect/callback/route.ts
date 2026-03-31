import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const establishmentId = searchParams.get("id");
  const slug = searchParams.get("slug");

  if (!establishmentId || !slug) {
    return Response.redirect(new URL("/", request.url));
  }

  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const { data: est } = await db
    .from("establishments")
    .select("stripe_account_id, payment_methods")
    .eq("id", establishmentId)
    .single();

  if (est?.stripe_account_id) {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
    const account = await stripe.accounts.retrieve(est.stripe_account_id);
    const complete = account.details_submitted;

    const pm = (est.payment_methods as Record<string, unknown>) ?? {};
    pm.stripe = { enabled: complete };

    await db.from("establishments").update({
      stripe_onboarding_complete: complete,
      payment_methods: pm,
    }).eq("id", establishmentId);
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://lido-facile.it";
  return Response.redirect(`${appUrl}/dashboard/${slug}/impostazioni?stripe_ok=1`);
}

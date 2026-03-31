import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

function adminSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

export async function POST(request: Request) {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return Response.json({ error: "Firma mancante" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return Response.json({ error: "Firma non valida" }, { status: 400 });
  }

  const db = adminSupabase();

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const establishmentId = session.client_reference_id;
      if (!establishmentId) break;

      const expiresAt = new Date();
      expiresAt.setFullYear(expiresAt.getFullYear() + 1);

      await db.from("establishments").update({
        subscription_status: "active",
        subscription_expires_at: expiresAt.toISOString(),
      }).eq("id", establishmentId);

      // Salva subscription Stripe
      if (session.subscription) {
        await db.from("platform_subscriptions").upsert({
          establishment_id: establishmentId,
          stripe_subscription_id: session.subscription as string,
          stripe_customer_id: session.customer as string,
          status: "active",
          current_period_end: expiresAt.toISOString(),
          amount_cents: 49700,
        }, { onConflict: "establishment_id" });
      }
      break;
    }

    case "customer.subscription.deleted":
    case "customer.subscription.paused": {
      const sub = event.data.object as Stripe.Subscription;
      const { data } = await db
        .from("platform_subscriptions")
        .select("establishment_id")
        .eq("stripe_subscription_id", sub.id)
        .single();

      if (data?.establishment_id) {
        await db.from("establishments").update({
          subscription_status: "cancelled",
        }).eq("id", data.establishment_id);

        await db.from("platform_subscriptions").update({
          status: "cancelled",
        }).eq("stripe_subscription_id", sub.id);
      }
      break;
    }

    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice;
      if (!invoice.subscription) break;
      const { data } = await db
        .from("platform_subscriptions")
        .select("establishment_id")
        .eq("stripe_subscription_id", invoice.subscription as string)
        .single();

      if (data?.establishment_id) {
        await db.from("establishments").update({
          subscription_status: "past_due",
        }).eq("id", data.establishment_id);
      }
      break;
    }

    case "customer.subscription.updated": {
      const sub = event.data.object as Stripe.Subscription;
      const { data } = await db
        .from("platform_subscriptions")
        .select("establishment_id")
        .eq("stripe_subscription_id", sub.id)
        .single();

      if (data?.establishment_id) {
        const status = sub.status === "active" ? "active"
          : sub.status === "past_due" ? "past_due"
          : "cancelled";

        await db.from("establishments").update({
          subscription_status: status,
          subscription_expires_at: new Date(sub.current_period_end * 1000).toISOString(),
        }).eq("id", data.establishment_id);
      }
      break;
    }
  }

  return Response.json({ received: true });
}

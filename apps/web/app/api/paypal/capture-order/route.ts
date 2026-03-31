import { createClient } from "@supabase/supabase-js";

function adminSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

export async function POST(request: Request) {
  const { orderId, establishmentId } = await request.json();
  if (!orderId || !establishmentId) {
    return Response.json({ error: "Parametri mancanti" }, { status: 400 });
  }

  // Access token PayPal
  const tokenRes = await fetch("https://api-m.paypal.com/v1/oauth2/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(
        `${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_SECRET}`
      ).toString("base64")}`,
    },
    body: "grant_type=client_credentials",
  });

  const tokenData = await tokenRes.json();
  if (!tokenData.access_token) {
    return Response.json({ error: "Errore autenticazione PayPal" }, { status: 500 });
  }

  // Capture
  const captureRes = await fetch(
    `https://api-m.paypal.com/v2/checkout/orders/${orderId}/capture`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokenData.access_token}`,
      },
    }
  );

  const captureData = await captureRes.json();

  if (captureData.status !== "COMPLETED") {
    console.error("PayPal capture failed:", captureData);
    return Response.json({ error: "Pagamento non completato" }, { status: 400 });
  }

  // Attiva abbonamento
  const db = adminSupabase();
  const expiresAt = new Date();
  expiresAt.setFullYear(expiresAt.getFullYear() + 1);

  await db.from("establishments").update({
    subscription_status: "active",
    subscription_expires_at: expiresAt.toISOString(),
  }).eq("id", establishmentId);

  await db.from("platform_subscriptions").upsert({
    establishment_id: establishmentId,
    paypal_order_id: orderId,
    status: "active",
    current_period_end: expiresAt.toISOString(),
    amount_cents: 49700,
  }, { onConflict: "establishment_id" });

  return Response.json({ success: true });
}

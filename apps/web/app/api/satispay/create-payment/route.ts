import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

function adminSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

const SATISPAY_BASE = process.env.SATISPAY_SANDBOX === "true"
  ? "https://staging.authservices.satispay.com"
  : "https://authservices.satispay.com";

function buildSatispayAuthHeader(
  method: string,
  path: string,
  host: string,
  date: string,
  body: string,
  keyId: string,
  privateKey: string
): { Authorization: string; Digest: string } {
  const bodyHash = crypto.createHash("sha256").update(body).digest("base64");
  const digest = `SHA-256=${bodyHash}`;

  const signingString = [
    `(request-target): ${method.toLowerCase()} ${path}`,
    `host: ${host}`,
    `date: ${date}`,
    `digest: ${digest}`,
  ].join("\n");

  const sign = crypto.createSign("RSA-SHA256");
  sign.update(signingString);
  const signature = sign.sign(privateKey, "base64");

  return {
    Authorization: `Signature keyId="${keyId}", algorithm="rsa-sha256", headers="(request-target) host date digest", signature="${signature}"`,
    Digest: digest,
  };
}

/**
 * POST /api/satispay/create-payment
 * Body: { bookingId: string }
 * Returns: { redirect_url: string }
 */
export async function POST(req: Request) {
  const { bookingId } = await req.json();
  if (!bookingId) return Response.json({ error: "bookingId mancante" }, { status: 400 });

  const db = adminSupabase();

  // Load booking
  const { data: booking } = await db
    .from("bookings")
    .select("id, booking_code, total_cents, establishment_id")
    .eq("id", bookingId)
    .single();

  if (!booking) return Response.json({ error: "Prenotazione non trovata" }, { status: 404 });

  // Load establishment credentials
  const { data: est } = await db
    .from("establishments")
    .select("slug, payment_methods")
    .eq("id", booking.establishment_id)
    .single();

  const pm = est?.payment_methods as Record<string, Record<string, unknown>> | null;
  const satispay = pm?.satispay;

  if (!satispay?.key_id || !satispay?.private_key) {
    return Response.json({ error: "Satispay non configurato" }, { status: 400 });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://lido-facile.it";
  const callbackUrl = `${appUrl}/lido/${est?.slug}/prenota/success?booking_code=${booking.booking_code}&method=satispay`;

  const path = "/g_business/v1/payment_requests";
  const host = new URL(SATISPAY_BASE).host;
  const date = new Date().toUTCString();

  const body = JSON.stringify({
    flow: "MATCH_CODE",
    amount_unit: booking.total_cents,
    currency: "EUR",
    callback_url: callbackUrl,
    redirect_url: callbackUrl,
    external_code: booking.booking_code,
    metadata: { booking_id: bookingId },
  });

  const { Authorization, Digest } = buildSatispayAuthHeader(
    "POST", path, host, date, body,
    satispay.key_id as string,
    satispay.private_key as string
  );

  const res = await fetch(`${SATISPAY_BASE}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization,
      Digest,
      Date: date,
      Host: host,
    },
    body,
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    return Response.json(
      { error: data.message ?? "Errore Satispay" },
      { status: 400 }
    );
  }

  // Update booking with satispay payment id
  await db
    .from("bookings")
    .update({ stripe_payment_intent_id: `satispay_${data.id}` })
    .eq("id", bookingId);

  return Response.json({ redirect_url: data.redirect_url ?? data.approval_url });
}

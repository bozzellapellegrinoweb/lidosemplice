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

/**
 * POST /api/satispay/webhook
 * Satispay invia un payment_id — verifichiamo lo stato via API e aggiorniamo la prenotazione.
 */
export async function POST(req: Request) {
  const body = await req.text();
  let payload: { id?: string; type?: string; external_code?: string } = {};
  try { payload = JSON.parse(body); } catch { /* ignore */ }

  const paymentId = payload.id;
  if (!paymentId) return new Response("ok", { status: 200 });

  // Use external_code (booking_code) to find the booking
  const bookingCode = payload.external_code;
  if (!bookingCode) return new Response("ok", { status: 200 });

  const db = adminSupabase();

  const { data: booking } = await db
    .from("bookings")
    .select("id, establishment_id, status")
    .eq("booking_code", bookingCode)
    .single();

  if (!booking || booking.status === "confirmed") return new Response("ok", { status: 200 });

  // Fetch establishment credentials to verify payment status from Satispay API
  const { data: est } = await db
    .from("establishments")
    .select("payment_methods")
    .eq("id", booking.establishment_id)
    .single();

  const pm = est?.payment_methods as Record<string, Record<string, unknown>> | null;
  const satispay = pm?.satispay;

  if (satispay?.key_id && satispay?.private_key) {
    // Verify payment with Satispay API
    const path = `/g_business/v1/payment_requests/${paymentId}`;
    const host = new URL(SATISPAY_BASE).host;
    const date = new Date().toUTCString();
    const emptyBody = "";
    const bodyHash = crypto.createHash("sha256").update(emptyBody).digest("base64");
    const digest = `SHA-256=${bodyHash}`;

    const signingString = [
      `(request-target): get ${path}`,
      `host: ${host}`,
      `date: ${date}`,
      `digest: ${digest}`,
    ].join("\n");

    const sign = crypto.createSign("RSA-SHA256");
    sign.update(signingString);
    const signature = sign.sign(satispay.private_key as string, "base64");
    const authHeader = `Signature keyId="${satispay.key_id}", algorithm="rsa-sha256", headers="(request-target) host date digest", signature="${signature}"`;

    const verifyRes = await fetch(`${SATISPAY_BASE}${path}`, {
      headers: { Authorization: authHeader, Digest: digest, Date: date, Host: host },
    }).catch(() => null);

    if (verifyRes?.ok) {
      const verifyData = await verifyRes.json().catch(() => ({}));
      if (verifyData.status === "ACCEPTED") {
        await db
          .from("bookings")
          .update({ status: "confirmed" })
          .eq("id", booking.id);
      }
    }
  } else {
    // Fallback: trust the webhook
    await db.from("bookings").update({ status: "confirmed" }).eq("id", booking.id);
  }

  return new Response("ok", { status: 200 });
}

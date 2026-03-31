import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

function adminSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

/**
 * POST /api/revolut/webhook
 * Handles Revolut Merchant order completion events.
 * Revolut signs the body with HMAC-SHA256 using a webhook secret.
 */
export async function POST(req: Request) {
  const body = await req.text();
  const signature = req.headers.get("revolut-signature") ?? "";
  const webhookSecret = process.env.REVOLUT_WEBHOOK_SECRET;

  // Verify HMAC signature if webhook secret is configured
  if (webhookSecret && signature) {
    const [, sigValue] = signature.split("=");
    const expected = crypto
      .createHmac("sha256", webhookSecret)
      .update(body)
      .digest("hex");
    if (sigValue !== expected) {
      return new Response("Signature non valida", { status: 401 });
    }
  }

  let event: {
    event?: string;
    order_id?: string;
    merchant_order_ext_ref?: string;
    state?: string;
  } = {};
  try { event = JSON.parse(body); } catch { return new Response("ok", { status: 200 }); }

  // Only handle completed payments
  if (event.event !== "ORDER_COMPLETED" && event.state !== "COMPLETED") {
    return new Response("ok", { status: 200 });
  }

  const bookingCode = event.merchant_order_ext_ref;
  if (!bookingCode) return new Response("ok", { status: 200 });

  const db = adminSupabase();

  await db
    .from("bookings")
    .update({ status: "confirmed" })
    .eq("booking_code", bookingCode)
    .eq("status", "pending_payment");

  return new Response("ok", { status: 200 });
}

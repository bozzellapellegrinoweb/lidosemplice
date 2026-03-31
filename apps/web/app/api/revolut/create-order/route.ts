import { createClient } from "@supabase/supabase-js";

function adminSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

const REVOLUT_BASE = process.env.REVOLUT_SANDBOX === "true"
  ? "https://sandbox-merchant.revolut.com/api/1.0"
  : "https://merchant.revolut.com/api/1.0";

/**
 * POST /api/revolut/create-order
 * Body: { bookingId: string }
 * Returns: { checkout_url: string }
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
  const revolut = pm?.revolut;

  if (!revolut?.api_key) {
    return Response.json({ error: "Revolut non configurato" }, { status: 400 });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://lido-facile.it";
  const successUrl = `${appUrl}/lido/${est?.slug}/prenota/success?booking_code=${booking.booking_code}&method=revolut`;
  const cancelUrl = `${appUrl}/lido/${est?.slug}/prenota`;

  const res = await fetch(`${REVOLUT_BASE}/orders`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${revolut.api_key}`,
      "Revolut-Api-Version": "2024-09-01",
    },
    body: JSON.stringify({
      amount: booking.total_cents,
      currency: "EUR",
      description: `Prenotazione ${booking.booking_code}`,
      merchant_order_ext_ref: booking.booking_code,
      settlement_currency: "EUR",
      customer_email: "", // optional, filled if available
      redirect_url: successUrl,
      cancel_redirect_url: cancelUrl,
    }),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    return Response.json(
      { error: data.message ?? data.error_message ?? "Errore Revolut" },
      { status: 400 }
    );
  }

  // Save Revolut order id
  await db
    .from("bookings")
    .update({ stripe_payment_intent_id: `revolut_${data.id}` })
    .eq("id", bookingId);

  return Response.json({ checkout_url: data.checkout_url });
}

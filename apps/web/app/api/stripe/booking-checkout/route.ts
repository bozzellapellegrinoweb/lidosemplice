import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

function adminSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

/**
 * POST /api/stripe/booking-checkout
 * Crea una Checkout Session usando le chiavi Stripe del lido.
 * Il pagamento va direttamente al lido, LidoFacile non è coinvolta.
 */
export async function POST(request: Request) {
  const { bookingId, slug } = await request.json() as { bookingId: string; slug: string };
  if (!bookingId) return Response.json({ error: "bookingId mancante" }, { status: 400 });

  const db = adminSupabase();

  const { data: booking } = await db
    .from("bookings")
    .select("id, booking_code, guest_email, total_cents, establishment_id")
    .eq("id", bookingId)
    .single();

  if (!booking) return Response.json({ error: "Prenotazione non trovata" }, { status: 404 });

  const { data: est } = await db
    .from("establishments")
    .select("payment_methods, slug")
    .eq("id", booking.establishment_id)
    .single();

  const stripeConfig = (est?.payment_methods as Record<string, Record<string, string>>)?.stripe;
  const secretKey = stripeConfig?.secret_key;

  if (!secretKey) {
    return Response.json({ error: "Stripe non configurato per questo stabilimento" }, { status: 400 });
  }

  try {
    const stripe = new Stripe(secretKey);
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://lido-facile.it";
    const estSlug = slug || est?.slug;

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "eur",
            unit_amount: booking.total_cents,
            product_data: { name: `Prenotazione ${booking.booking_code}` },
          },
          quantity: 1,
        },
      ],
      ...(booking.guest_email ? { customer_email: booking.guest_email } : {}),
      success_url: `${appUrl}/api/stripe/booking-return?bookingId=${bookingId}&slug=${estSlug}&booking_code=${booking.booking_code}`,
      cancel_url: `${appUrl}/lido/${estSlug}/prenota`,
      metadata: { booking_id: bookingId },
    });

    return Response.json({ url: session.url });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Errore Stripe";
    console.error("Stripe booking checkout error:", message);
    return Response.json({ error: message }, { status: 500 });
  }
}

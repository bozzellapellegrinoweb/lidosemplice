import { createClient } from "@supabase/supabase-js";

function adminSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

/**
 * GET /api/stripe/booking-return?bookingId=X&slug=Y&booking_code=Z
 * Stripe redirects here after successful payment. Confirms booking and sends emails.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const bookingId = searchParams.get("bookingId");
  const slug = searchParams.get("slug");
  const bookingCode = searchParams.get("booking_code");

  if (bookingId) {
    const db = adminSupabase();
    await db
      .from("bookings")
      .update({ status: "confirmed" })
      .eq("id", bookingId)
      .eq("status", "pending_payment");

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://lido-facile.it";

    fetch(`${appUrl}/api/email/booking-confirmation`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bookingId }),
    }).catch(console.error);

    fetch(`${appUrl}/api/email/nuova-prenotazione`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bookingId }),
    }).catch(console.error);
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://lido-facile.it";
  return Response.redirect(
    `${appUrl}/lido/${slug}/prenota/success?booking_code=${bookingCode}&method=stripe`
  );
}

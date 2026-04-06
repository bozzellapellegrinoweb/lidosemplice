import { createClient } from "@supabase/supabase-js";

function adminSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

/**
 * GET /api/bookings/paypal-return?bookingId=X&slug=Y&booking_code=Z
 * PayPal redirects here after payment. Confirms the booking and sends emails.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const bookingId = searchParams.get("bookingId");
  const slug = searchParams.get("slug");
  const bookingCode = searchParams.get("booking_code");

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://lido-facile.it";
  let qrToken = "";

  if (bookingId) {
    const db = adminSupabase();

    await db
      .from("bookings")
      .update({ status: "confirmed" })
      .eq("id", bookingId)
      .eq("status", "pending_payment");

    // Fetch qr_code_token per mostrarlo nella pagina di successo
    const { data: booking } = await db
      .from("bookings")
      .select("qr_code_token")
      .eq("id", bookingId)
      .single();

    qrToken = booking?.qr_code_token ?? "";

    // Await entrambe le email — in serverless il fire-and-forget non funziona
    await Promise.allSettled([
      fetch(`${appUrl}/api/email/booking-confirmation`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId }),
      }),
      fetch(`${appUrl}/api/email/nuova-prenotazione`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId }),
      }),
    ]);
  }

  const params = new URLSearchParams({
    booking_code: bookingCode ?? "",
    method: "paypal",
    ...(qrToken ? { qr_token: qrToken } : {}),
  });

  return Response.redirect(`${appUrl}/lido/${slug}/prenota/success?${params.toString()}`);
}

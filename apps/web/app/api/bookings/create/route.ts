import { createClient } from "@supabase/supabase-js";
import { generateBookingCode } from "@/lib/utils";

function adminSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

interface BookingItem {
  map_element_id: string;
  sunbeds_count: number;
  price_cents: number;
}

interface BookingService {
  service_id: string;
  quantity: number;
  price_cents: number;
}

/**
 * POST /api/bookings/create
 * Called from the public booking page (anonymous users).
 * Uses service role to bypass RLS on bookings/booking_items/booking_services.
 */
export async function POST(req: Request) {
  const body = await req.json();
  const {
    establishment_id,
    guest_name,
    guest_email,
    guest_phone,
    start_date,
    end_date,
    duration_type,
    half_period,
    payment_method,
    total_cents,
    items,
    services,
  }: {
    establishment_id: string;
    guest_name: string;
    guest_email?: string;
    guest_phone?: string;
    start_date: string;
    end_date: string;
    duration_type?: string;
    half_period?: string;
    payment_method: string;
    total_cents: number;
    items: BookingItem[];
    services: BookingService[];
  } = body;

  const duration =
    duration_type === "half_day"
      ? half_period === "afternoon"
        ? "half_day_afternoon"
        : "half_day_morning"
      : "full_day";

  if (!establishment_id || !guest_name || !start_date || !end_date || !payment_method) {
    return Response.json({ error: "Parametri mancanti" }, { status: 400 });
  }

  const db = adminSupabase();
  const bookingCode = generateBookingCode();
  const qrToken = crypto.randomUUID();

  const redirectMethods = ["satispay", "revolut", "stripe"];
  const status =
    payment_method === "cash"
      ? "pending"
      : redirectMethods.includes(payment_method)
        ? "pending_payment"
        : "confirmed";

  // Insert booking
  const { data: booking, error } = await db
    .from("bookings")
    .insert({
      establishment_id,
      booking_code: bookingCode,
      guest_name,
      guest_email: guest_email || null,
      guest_phone: guest_phone || null,
      start_date,
      end_date,
      duration,
      status,
      payment_method,
      total_cents,
      qr_code_token: qrToken,
    })
    .select("id")
    .single();

  if (error || !booking) {
    console.error("Booking insert error:", error);
    return Response.json({ error: error?.message ?? "Errore DB" }, { status: 500 });
  }

  // Insert booking items
  if (items && items.length > 0) {
    const { error: itemsError } = await db.from("booking_items").insert(
      items.map((item) => ({ ...item, booking_id: booking.id }))
    );
    if (itemsError) console.error("booking_items error:", itemsError);
  }

  // Insert booking services
  if (services && services.length > 0) {
    const { error: servicesError } = await db.from("booking_services").insert(
      services.map((s) => ({ ...s, booking_id: booking.id }))
    );
    if (servicesError) console.error("booking_services error:", servicesError);
  }

  return Response.json({
    id: booking.id,
    booking_code: bookingCode,
    qr_token: qrToken,
    status,
  });
}

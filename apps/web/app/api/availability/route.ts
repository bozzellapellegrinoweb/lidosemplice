import { createClient } from "@supabase/supabase-js";
import { NextRequest } from "next/server";

function adminSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

// GET /api/availability?establishment_id=...&start_date=...&end_date=...
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const establishmentId = searchParams.get("establishment_id");
  const startDate = searchParams.get("start_date");
  const endDate = searchParams.get("end_date");

  if (!establishmentId || !startDate || !endDate) {
    return Response.json({ error: "Parametri mancanti" }, { status: 400 });
  }

  const db = adminSupabase();

  const { data: bookings } = await db
    .from("bookings")
    .select("id")
    .eq("establishment_id", establishmentId)
    .lte("start_date", endDate)
    .gte("end_date", startDate)
    .in("status", ["confirmed", "checked_in", "pending"]);

  const occupiedIds: string[] = [];
  if (bookings?.length) {
    const { data: items } = await db
      .from("booking_items")
      .select("map_element_id")
      .in("booking_id", bookings.map((b) => b.id));
    items?.forEach((i) => occupiedIds.push(i.map_element_id));
  }

  return Response.json({ occupiedIds });
}

import { createClient } from "@supabase/supabase-js";
import { NextRequest } from "next/server";

function adminSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

/**
 * GET /api/booking-config?slug=XXX
 * Returns public-safe payment config for the booking page.
 * Strips all sensitive credentials (private_key, api_key, etc.).
 */
export async function GET(req: NextRequest) {
  const slug = new URL(req.url).searchParams.get("slug");
  if (!slug) return Response.json({ error: "slug mancante" }, { status: 400 });

  const db = adminSupabase();
  const { data, error } = await db
    .from("establishments")
    .select("id, name, primary_color, payment_methods, paypal_enabled")
    .eq("slug", slug)
    .eq("is_active", true)
    .single();

  if (error || !data) return Response.json({ error: "Non trovato" }, { status: 404 });

  const pm = (data.payment_methods || {}) as Record<string, Record<string, unknown>>;
  const publicPm: Record<string, Record<string, unknown>> = {};

  for (const [method, config] of Object.entries(pm)) {
    // Strip sensitive credentials — never expose to client
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { private_key, api_key, activation_token, secret_key, ...publicConfig } = config as Record<string, unknown>;
    publicPm[method] = publicConfig;
  }

  // Fallback for legacy paypal_enabled field
  if (!publicPm.cash) publicPm.cash = { enabled: true };
  if (data.paypal_enabled && !publicPm.paypal?.enabled) {
    publicPm.paypal = { ...(publicPm.paypal ?? {}), enabled: true };
  }

  return Response.json({
    id: data.id,
    name: data.name,
    primary_color: data.primary_color,
    payment_methods: publicPm,
  });
}

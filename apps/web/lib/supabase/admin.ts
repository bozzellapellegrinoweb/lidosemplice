import { createClient } from "@supabase/supabase-js";

/**
 * Admin client with service role key — bypasses RLS.
 * Use ONLY in server-side code (Server Components, API routes).
 * NEVER expose this key to the browser.
 */
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

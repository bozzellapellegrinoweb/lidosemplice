/**
 * GET /api/leads/list
 * Restituisce i leads salvati su Supabase con filtri e paginazione.
 * Solo super admin.
 */
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(req: Request) {
  // Auth check
  const supabaseAuth = await createServerClient();
  const { data: { user } } = await supabaseAuth.auth.getUser();
  if (!user) return Response.json({ error: "Non autenticato" }, { status: 401 });

  const superAdminEmails = (process.env.SUPER_ADMIN_EMAILS || "").split(",").map((e) => e.trim());
  if (!superAdminEmails.includes(user.email ?? "")) {
    return Response.json({ error: "Accesso non autorizzato" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") || "";
  const from = searchParams.get("from") || "";
  const to = searchParams.get("to") || "";
  const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
  const pageSize = 50;
  const offset = (page - 1) * pageSize;

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  let query = supabase
    .from("leads")
    .select("*", { count: "exact" })
    .order("scraped_at", { ascending: false })
    .range(offset, offset + pageSize - 1);

  if (q) {
    query = query.or(
      `nome.ilike.%${q}%,citta.ilike.%${q}%,categoria.ilike.%${q}%,email.ilike.%${q}%`
    );
  }
  if (from) query = query.gte("scraped_at", from);
  if (to) query = query.lte("scraped_at", to + "T23:59:59Z");

  const { data, count, error } = await query;
  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json({ data, count, page, pageSize });
}

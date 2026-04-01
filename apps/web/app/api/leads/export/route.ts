/**
 * GET /api/leads/export
 * Esporta tutti i leads filtrati come file CSV.
 * Solo super admin.
 */
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";

const CSV_HEADERS = [
  "Nome", "Citta", "CAP", "Indirizzo", "Telefono",
  "Email", "SitoWeb", "Rating", "Recensioni", "Categoria", "GoogleMaps",
];

function escapeCsv(val: unknown): string {
  if (val === null || val === undefined) return "";
  const str = String(val);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

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

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  let query = supabase
    .from("leads")
    .select("nome,citta,cap,indirizzo,telefono,email,sito_web,rating,recensioni,categoria,google_maps_url")
    .order("citta", { ascending: true })
    .limit(20000);

  if (q) {
    query = query.or(
      `nome.ilike.%${q}%,citta.ilike.%${q}%,categoria.ilike.%${q}%,email.ilike.%${q}%`
    );
  }
  if (from) query = query.gte("scraped_at", from);
  if (to) query = query.lte("scraped_at", to + "T23:59:59Z");

  const { data, error } = await query;
  if (error) return Response.json({ error: error.message }, { status: 500 });

  const rows = [
    CSV_HEADERS.join(","),
    ...(data ?? []).map((r) =>
      [
        r.nome, r.citta, r.cap, r.indirizzo, r.telefono,
        r.email, r.sito_web, r.rating, r.recensioni, r.categoria, r.google_maps_url,
      ]
        .map(escapeCsv)
        .join(",")
    ),
  ];

  const csv = rows.join("\n");
  const today = new Date().toISOString().slice(0, 10);

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="leads-${today}.csv"`,
    },
  });
}

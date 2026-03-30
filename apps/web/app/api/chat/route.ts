import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

const ANTHROPIC_API = "https://api.anthropic.com/v1/messages";

// ─── Tipi ────────────────────────────────────────────────────────────────────

type TextBlock = { type: "text"; text: string };
type ToolUseBlock = { type: "tool_use"; id: string; name: string; input: Record<string, unknown> };
type ToolResultBlock = { type: "tool_result"; tool_use_id: string; content: string };
type ContentBlock = TextBlock | ToolUseBlock | ToolResultBlock;

interface AnthropicMessage {
  role: "user" | "assistant";
  content: string | ContentBlock[];
}

// ─── Tools disponibili per il cliente ────────────────────────────────────────

const CLIENT_TOOLS = [
  {
    name: "get_availability",
    description: "Controlla quali ombrelloni/posti sono disponibili per un periodo. Usalo sempre prima di proporre elementi al cliente.",
    input_schema: {
      type: "object",
      properties: {
        start_date: { type: "string", description: "Data inizio soggiorno (YYYY-MM-DD)" },
        end_date: { type: "string", description: "Data fine soggiorno (YYYY-MM-DD)" },
      },
      required: ["start_date", "end_date"],
    },
  },
  {
    name: "get_prices",
    description: "Ottieni i prezzi per un periodo. Usa sempre questo tool prima di comunicare un prezzo al cliente.",
    input_schema: {
      type: "object",
      properties: {
        start_date: { type: "string", description: "Data inizio (YYYY-MM-DD)" },
        end_date: { type: "string", description: "Data fine (YYYY-MM-DD)" },
      },
      required: ["start_date", "end_date"],
    },
  },
  {
    name: "create_booking",
    description: "Crea la prenotazione dopo aver raccolto: nome, telefono, date, elemento scelto. Chiedi conferma al cliente prima di usare questo tool.",
    input_schema: {
      type: "object",
      properties: {
        guest_name: { type: "string", description: "Nome e cognome del cliente" },
        guest_phone: { type: "string", description: "Telefono del cliente" },
        guest_email: { type: "string", description: "Email del cliente (opzionale)" },
        start_date: { type: "string", description: "Data inizio (YYYY-MM-DD)" },
        end_date: { type: "string", description: "Data fine (YYYY-MM-DD)" },
        element_id: { type: "string", description: "ID dell'elemento da prenotare (dalla lista disponibilità)" },
        sunbeds_count: { type: "number", description: "Numero di lettini (default 2)" },
      },
      required: ["guest_name", "guest_phone", "start_date", "end_date", "element_id"],
    },
  },
];

// ─── Esecuzione tools ─────────────────────────────────────────────────────────

async function runTool(
  name: string,
  input: Record<string, unknown>,
  establishmentId: string
): Promise<string> {
  // Usa admin client per bypassare RLS (le query dei tool non richiedono sessione utente)
  const supabase = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  if (name === "get_availability") {
    const { start_date, end_date } = input as { start_date: string; end_date: string };

    // Tutti gli elementi attivi con la loro fila
    const { data: maps } = await supabase
      .from("beach_maps")
      .select("id, name")
      .eq("establishment_id", establishmentId)
      .eq("is_active", true);

    if (!maps?.length) return "Nessuna mappa configurata.";

    const mapIds = maps.map((m) => m.id);
    const { data: rows } = await supabase
      .from("map_rows")
      .select("id, label, row_number, beach_map_id")
      .in("beach_map_id", mapIds)
      .order("row_number");

    if (!rows?.length) return "Nessuna fila configurata.";

    const rowIds = rows.map((r) => r.id);
    const { data: elements } = await supabase
      .from("map_elements")
      .select("id, label, element_type, row_id")
      .in("row_id", rowIds)
      .eq("is_bookable", true);

    if (!elements?.length) return "Nessun elemento prenotabile.";

    // Prenotazioni attive in quel periodo
    const { data: activeBookings } = await supabase
      .from("bookings")
      .select("id")
      .eq("establishment_id", establishmentId)
      .in("status", ["confirmed", "checked_in", "pending"])
      .lte("start_date", end_date)
      .gte("end_date", start_date);

    const activeIds = (activeBookings || []).map((b) => b.id);
    const occupiedIds = new Set<string>();
    if (activeIds.length > 0) {
      const { data: occupiedItems } = await supabase
        .from("booking_items")
        .select("map_element_id")
        .in("booking_id", activeIds);
      (occupiedItems || []).forEach((i) => occupiedIds.add(i.map_element_id));
    }

    // Raggruppa per fila
    const result: string[] = [];
    for (const row of rows) {
      const available = elements.filter(
        (e) => e.row_id === row.id && !occupiedIds.has(e.id)
      );
      if (available.length > 0) {
        const map = maps.find((m) => m.id === row.beach_map_id);
        result.push(
          `${map?.name || "Spiaggia"} - Fila ${row.row_number} (${row.label}): ${available.map((e) => `${e.label} (id:${e.id})`).join(", ")}`
        );
      }
    }

    return result.length
      ? `Disponibilità dal ${start_date} al ${end_date}:\n${result.join("\n")}`
      : `Nessun posto disponibile dal ${start_date} al ${end_date}.`;
  }

  if (name === "get_prices") {
    const { start_date, end_date } = input as { start_date: string; end_date: string };

    const { data: seasons } = await supabase
      .from("seasons")
      .select("id, name, start_date, end_date")
      .eq("establishment_id", establishmentId)
      .lte("start_date", end_date)
      .gte("end_date", start_date);

    if (!seasons?.length) return "Nessuna stagione/tariffa configurata per questo periodo.";

    const seasonIds = seasons.map((s) => s.id);
    const { data: pricing } = await supabase
      .from("pricing_rules")
      .select("base_price, duration, season_id, row_id, map_rows(row_number, label)")
      .in("season_id", seasonIds)
      .eq("duration", "full_day");

    if (!pricing?.length) return "Nessuna tariffa disponibile.";

    const days = Math.max(
      1,
      Math.ceil((new Date(end_date).getTime() - new Date(start_date).getTime()) / 86400000)
    );

    const lines = pricing.map((p) => {
      const season = seasons.find((s) => s.id === p.season_id);
      const rowData = p.map_rows as unknown as { row_number: number; label: string } | { row_number: number; label: string }[] | null;
      const row = Array.isArray(rowData) ? rowData[0] ?? null : rowData;
      const rowLabel = row ? `Fila ${row.row_number} (${row.label})` : "Tutte le file";
      const total = (Number(p.base_price) * days).toFixed(2);
      return `${rowLabel}: ${Number(p.base_price).toFixed(2)}€/giorno → totale ${total}€ (${season?.name})`;
    });

    return `Tariffe per ${days} giorno/i (${start_date} → ${end_date}):\n${lines.join("\n")}`;
  }

  if (name === "create_booking") {
    const { guest_name, guest_phone, guest_email, start_date, end_date, element_id, sunbeds_count } =
      input as {
        guest_name: string;
        guest_phone: string;
        guest_email?: string;
        start_date: string;
        end_date: string;
        element_id: string;
        sunbeds_count?: number;
      };

    // Trova elemento e fila
    const { data: el } = await supabase
      .from("map_elements")
      .select("id, label, row_id")
      .eq("id", element_id)
      .single();

    if (!el) return "Elemento non trovato.";

    const { data: row } = await supabase
      .from("map_rows")
      .select("id, row_number, label")
      .eq("id", el.row_id)
      .single();

    const days = Math.max(
      1,
      Math.ceil((new Date(end_date).getTime() - new Date(start_date).getTime()) / 86400000)
    );

    // Cerca prezzo per la fila in quel periodo
    const { data: seasons } = await supabase
      .from("seasons")
      .select("id")
      .eq("establishment_id", establishmentId)
      .lte("start_date", end_date)
      .gte("end_date", start_date)
      .limit(1);

    let dailyPrice = 0;
    if (seasons?.length && row) {
      const { data: pr } = await supabase
        .from("pricing_rules")
        .select("base_price")
        .eq("season_id", seasons[0].id)
        .eq("row_id", row.id)
        .eq("duration", "full_day")
        .maybeSingle();
      dailyPrice = Number(pr?.base_price || 0);
    }

    const totalPrice = dailyPrice * days;

    // Genera codice prenotazione
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let bookingCode = "BK-";
    for (let i = 0; i < 5; i++) bookingCode += chars.charAt(Math.floor(Math.random() * chars.length));

    // Usa admin client per bypass RLS
    const adminSupabase = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const { data: booking, error } = await adminSupabase
      .from("bookings")
      .insert({
        establishment_id: establishmentId,
        booking_code: bookingCode,
        guest_name,
        guest_phone: guest_phone || null,
        guest_email: guest_email || null,
        start_date,
        end_date,
        duration: "full_day",
        status: "confirmed",
        payment_method: "onsite",
        subtotal: totalPrice,
        total: totalPrice,
      })
      .select("id")
      .single();

    if (error || !booking) return `Errore nella creazione: ${error?.message}`;

    await adminSupabase.from("booking_items").insert({
      booking_id: booking.id,
      map_element_id: element_id,
      num_sunbeds: sunbeds_count || 2,
      daily_price: dailyPrice,
    });

    return `Prenotazione creata con successo!\nCodice: ${bookingCode}\nPosto: ${el.label} (${row?.label})\nDate: ${start_date} → ${end_date}\nTotale: ${totalPrice.toFixed(2)}€\nIl cliente mostrerà il codice ${bookingCode} al check-in.`;
  }

  return "Tool non trovato.";
}

// ─── Handler principale ───────────────────────────────────────────────────────

export async function POST(request: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return Response.json({ error: "ANTHROPIC_API_KEY non configurata" }, { status: 503 });
  }

  const { messages, establishmentId, role } = await request.json() as {
    messages: { role: "user" | "assistant"; content: string }[];
    establishmentId: string;
    role: "admin" | "client";
  };

  if (!messages?.length) {
    return Response.json({ error: "Messaggi mancanti" }, { status: 400 });
  }

  const supabase = await createClient();

  // Contesto stabilimento
  let context = "";
  if (establishmentId) {
    const { data: est } = await supabase
      .from("establishments")
      .select("name, description, city, phone, check_in_time, check_out_time")
      .eq("id", establishmentId)
      .single();

    if (est) {
      const today = new Date().toISOString().split("T")[0];
      context = `Stabilimento: ${est.name} a ${est.city}. Orari: ${est.check_in_time}-${est.check_out_time}. Data di oggi: ${today}.`;
      if (est.description) context += ` ${est.description}.`;
    }

    if (role === "admin") {
      const today = new Date().toISOString().split("T")[0];
      const { count } = await supabase
        .from("bookings")
        .select("*", { count: "exact", head: true })
        .eq("establishment_id", establishmentId)
        .gte("start_date", today)
        .lte("start_date", today);
      context += ` Prenotazioni oggi: ${count || 0}.`;
    }
  }

  const systemPrompt =
    role === "admin"
      ? `Sei l'assistente AI di LidoFacile per il gestore. Rispondi in italiano, conciso e professionale. Niente emoji. ${context}`
      : `Sei l'assistente virtuale dello stabilimento balneare. Il tuo compito è aiutare i clienti a PRENOTARE un ombrellone via chat. Flusso da seguire:
1. Chiedi le date desiderate
2. Usa get_availability per verificare disponibilità
3. Usa get_prices per i prezzi
4. Proponi i posti disponibili e il prezzo totale
5. Chiedi nome e telefono
6. Chiedi conferma esplicita al cliente
7. Usa create_booking per creare la prenotazione
8. Mostra il codice di prenotazione
Rispondi in italiano, senza emoji. ${context}`;

  // Converti messaggi semplici in formato Anthropic
  const anthropicMessages: AnthropicMessage[] = messages.map((m) => ({
    role: m.role,
    content: m.content,
  }));

  const tools = role === "client" ? CLIENT_TOOLS : [];

  // Loop tool use
  let loopMessages = [...anthropicMessages];
  const MAX_ROUNDS = 6;

  for (let round = 0; round < MAX_ROUNDS; round++) {
    const body: Record<string, unknown> = {
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1024,
      system: systemPrompt,
      messages: loopMessages,
    };
    if (tools.length > 0) body.tools = tools;

    const res = await fetch(ANTHROPIC_API, {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("Anthropic error:", res.status, err);
      return Response.json({ error: `Errore API: ${res.status} ${err}` }, { status: 500 });
    }

    const data = await res.json() as {
      stop_reason: string;
      content: ContentBlock[];
    };

    if (data.stop_reason === "end_turn" || data.stop_reason !== "tool_use") {
      const text = (data.content as ContentBlock[])
        .filter((b): b is TextBlock => b.type === "text")
        .map((b) => b.text)
        .join("\n");
      return Response.json({ response: text });
    }

    // Esegui i tool calls
    const toolResults: ToolResultBlock[] = [];
    for (const block of data.content) {
      if (block.type === "tool_use") {
        const result = await runTool(block.name, block.input, establishmentId);
        toolResults.push({
          type: "tool_result",
          tool_use_id: block.id,
          content: result,
        });
      }
    }

    // Aggiungi risposta assistant + risultati tool al loop
    loopMessages = [
      ...loopMessages,
      { role: "assistant", content: data.content },
      { role: "user", content: toolResults as unknown as ContentBlock[] },
    ];
  }

  return Response.json({ response: "Mi dispiace, non ho potuto completare l'operazione. Riprova." });
}

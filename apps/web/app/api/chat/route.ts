import { createClient as createAdminClient } from "@supabase/supabase-js";

const ANTHROPIC_API = "https://api.anthropic.com/v1/messages";

type TextBlock = { type: "text"; text: string };
type ToolUseBlock = { type: "tool_use"; id: string; name: string; input: Record<string, unknown> };
type ToolResultBlock = { type: "tool_result"; tool_use_id: string; content: string };
type ContentBlock = TextBlock | ToolUseBlock | ToolResultBlock;

interface AnthropicMessage {
  role: "user" | "assistant";
  content: string | ContentBlock[];
}

// ─── Tool: verifica disponibilità real-time ───────────────────────────────────

const TOOL_GET_AVAILABILITY = {
  name: "get_availability",
  description: "Controlla quali ombrelloni sono disponibili per le date scelte. Usa sempre questo tool prima di proporre posti al cliente.",
  input_schema: {
    type: "object",
    properties: {
      start_date: { type: "string", description: "Data inizio (YYYY-MM-DD)" },
      end_date: { type: "string", description: "Data fine (YYYY-MM-DD)" },
    },
    required: ["start_date", "end_date"],
  },
};

// ─── Tool: crea prenotazione ──────────────────────────────────────────────────

const TOOL_CREATE_BOOKING = {
  name: "create_booking",
  description: "Crea la prenotazione dopo aver raccolto nome, telefono, date e ombrellone scelto. Chiedi conferma esplicita al cliente prima di usare questo tool.",
  input_schema: {
    type: "object",
    properties: {
      guest_name:    { type: "string", description: "Nome e cognome" },
      guest_phone:   { type: "string", description: "Telefono" },
      guest_email:   { type: "string", description: "Email del cliente (obbligatoria per la conferma)" },
      start_date:    { type: "string", description: "Data inizio (YYYY-MM-DD)" },
      end_date:      { type: "string", description: "Data fine (YYYY-MM-DD)" },
      element_id:    { type: "string", description: "ID ombrellone (dalla lista disponibilità)" },
      sunbeds_count: { type: "number", description: "Numero lettini (default 2)" },
    },
    required: ["guest_name", "guest_phone", "guest_email", "start_date", "end_date", "element_id"],
  },
};

// ─── Admin Supabase (bypassa RLS) ─────────────────────────────────────────────

function adminSupabase() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

// ─── Costruisce il contesto completo dello stabilimento ───────────────────────

async function buildEstablishmentContext(establishmentId: string): Promise<string> {
  const db = adminSupabase();
  const lines: string[] = [];

  // Info base
  const { data: est } = await db
    .from("establishments")
    .select("name, description, city, address, phone, email, check_in_time, check_out_time")
    .eq("id", establishmentId)
    .single();

  if (!est) return "";

  const today = new Date().toISOString().split("T")[0];
  lines.push(`STABILIMENTO: ${est.name}`);
  if (est.city) lines.push(`Città: ${est.city}`);
  if (est.address) lines.push(`Indirizzo: ${est.address}`);
  if (est.phone) lines.push(`Telefono: ${est.phone}`);
  if (est.email) lines.push(`Email: ${est.email}`);
  if (est.check_in_time) lines.push(`Orari: ${est.check_in_time} - ${est.check_out_time}`);
  if (est.description) lines.push(`Descrizione: ${est.description}`);
  lines.push(`Data di oggi: ${today}`);

  // Servizi extra
  const { data: services } = await db
    .from("additional_services")
    .select("name, description, price_cents, is_daily")
    .eq("establishment_id", establishmentId)
    .eq("is_active", true)
    .order("sort_order");

  if (services?.length) {
    lines.push("\nSERVIZI DISPONIBILI:");
    for (const s of services) {
      const euros = (s.price_cents || 0) / 100;
      const priceStr = euros === 0 ? "gratuito" : `${euros.toFixed(2)}€${s.is_daily ? "/giorno" : ""}`;
      lines.push(`- ${s.name}${s.description ? ` (${s.description})` : ""}: ${priceStr}`);
    }
  }

  // File e prezzi
  const { data: maps } = await db
    .from("beach_maps")
    .select("id, name")
    .eq("establishment_id", establishmentId)
    .eq("is_active", true);

  if (maps?.length) {
    const { data: seasons } = await db
      .from("seasons")
      .select("id, name, start_date, end_date")
      .eq("establishment_id", establishmentId)
      .gte("end_date", today)
      .order("start_date");

    lines.push("\nSTRUTTURA E TARIFFE:");
    for (const map of maps) {
      const { data: rows } = await db
        .from("map_rows")
        .select("id, label, row_number")
        .eq("beach_map_id", map.id)
        .order("row_number");

      if (!rows?.length) continue;
      lines.push(`\n[${map.name}]`);
      for (const row of rows) {
        let priceInfo = "";
        if (seasons?.length) {
          const prices: string[] = [];
          for (const season of seasons) {
            const { data: pr } = await db
              .from("pricing_rules")
              .select("base_price")
              .eq("season_id", season.id)
              .eq("row_id", row.id)
              .eq("duration", "full_day")
              .maybeSingle();
            if (pr?.base_price) {
              prices.push(`${Number(pr.base_price).toFixed(2)}€/giorno in ${season.name}`);
            }
          }
          if (prices.length) priceInfo = ` | ${prices.join("; ")}`;
        }
        lines.push(`  - Fila ${row.row_number}: ${row.label}${priceInfo}`);
      }
    }
  }

  return lines.join("\n");
}

// ─── Esecuzione tool get_availability ────────────────────────────────────────

async function runGetAvailability(input: Record<string, unknown>, establishmentId: string): Promise<string> {
  const { start_date, end_date } = input as { start_date: string; end_date: string };
  const db = adminSupabase();

  const { data: maps } = await db
    .from("beach_maps")
    .select("id, name")
    .eq("establishment_id", establishmentId)
    .eq("is_active", true);

  if (!maps?.length) return "Nessuna mappa configurata.";

  const mapIds = maps.map((m) => m.id);
  const { data: rows } = await db
    .from("map_rows")
    .select("id, label, row_number, beach_map_id")
    .in("beach_map_id", mapIds)
    .order("row_number");

  if (!rows?.length) return "Nessuna fila configurata.";

  const rowIds = rows.map((r) => r.id);
  const { data: elements } = await db
    .from("map_elements")
    .select("id, label, map_row_id")
    .in("map_row_id", rowIds)
    .eq("is_bookable", true);

  if (!elements?.length) return "Nessun ombrellone prenotabile configurato.";

  // Occupati nel periodo
  const { data: activeBookings } = await db
    .from("bookings")
    .select("id")
    .eq("establishment_id", establishmentId)
    .in("status", ["confirmed", "checked_in", "pending"])
    .lte("start_date", end_date)
    .gte("end_date", start_date);

  const occupiedIds = new Set<string>();
  if (activeBookings?.length) {
    const { data: items } = await db
      .from("booking_items")
      .select("map_element_id")
      .in("booking_id", activeBookings.map((b) => b.id));
    items?.forEach((i) => occupiedIds.add(i.map_element_id));
  }

  const result: string[] = [];
  for (const map of maps) {
    const mapRows = rows.filter((r) => r.beach_map_id === map.id);
    const mapLines: string[] = [];
    for (const row of mapRows) {
      const available = elements.filter((e) => e.map_row_id === row.id && !occupiedIds.has(e.id));
      if (available.length > 0) {
        mapLines.push(`  Fila ${row.row_number} (${row.label}): ${available.map((e) => `${e.label} [id:${e.id}]`).join(", ")}`);
      }
    }
    if (mapLines.length) {
      result.push(`[${map.name}]\n${mapLines.join("\n")}`);
    }
  }

  return result.length
    ? `Disponibilità dal ${start_date} al ${end_date}:\n${result.join("\n")}`
    : `Nessun posto disponibile dal ${start_date} al ${end_date}.`;
}

// ─── Esecuzione tool create_booking ──────────────────────────────────────────

async function runCreateBooking(input: Record<string, unknown>, establishmentId: string): Promise<string> {
  const { guest_name, guest_phone, guest_email, start_date, end_date, element_id, sunbeds_count } =
    input as {
      guest_name: string; guest_phone: string; guest_email?: string;
      start_date: string; end_date: string; element_id: string; sunbeds_count?: number;
    };

  const db = adminSupabase();

  const { data: el } = await db
    .from("map_elements").select("id, label, map_row_id").eq("id", element_id).single();
  if (!el) return "Ombrellone non trovato.";

  const { data: row } = await db
    .from("map_rows").select("id, row_number, label").eq("id", el.map_row_id).single();

  const days = Math.max(1, Math.ceil(
    (new Date(end_date).getTime() - new Date(start_date).getTime()) / 86400000
  ));

  // Prezzo per la fila nel periodo
  let dailyPrice = 0;
  const { data: seasons } = await db
    .from("seasons").select("id")
    .eq("establishment_id", establishmentId)
    .lte("start_date", end_date).gte("end_date", start_date).limit(1);

  if (seasons?.length && row) {
    const { data: pr } = await db
      .from("pricing_rules").select("base_price")
      .eq("season_id", seasons[0].id).eq("row_id", row.id).eq("duration", "full_day")
      .maybeSingle();
    dailyPrice = Number(pr?.base_price || 0);
  }

  const totalPrice = dailyPrice * days;

  // Codice prenotazione
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let bookingCode = "BK-";
  for (let i = 0; i < 5; i++) bookingCode += chars.charAt(Math.floor(Math.random() * chars.length));

  const { data: booking, error } = await db
    .from("bookings")
    .insert({
      establishment_id: establishmentId,
      booking_code: bookingCode,
      guest_name,
      guest_phone: guest_phone || null,
      guest_email: guest_email || null,
      start_date, end_date,
      duration: "full_day",
      status: "confirmed",
      payment_method: "onsite",
      subtotal: totalPrice,
      total: totalPrice,
    })
    .select("id").single();

  if (error || !booking) return `Errore: ${error?.message}`;

  await db.from("booking_items").insert({
    booking_id: booking.id,
    map_element_id: element_id,
    num_sunbeds: sunbeds_count || 2,
    daily_price: dailyPrice,
  });

  const emailNote = guest_email ? `Una email di conferma con il QR code verrà inviata a ${guest_email}.` : "";
  return `Prenotazione confermata!\nCodice: ${bookingCode}\nOmbrellone: ${el.label} — ${row?.label}\nDate: ${start_date} → ${end_date}\nTotale: ${totalPrice > 0 ? totalPrice.toFixed(2) + "€" : "da concordare"}\n${emailNote}\nMostra il codice ${bookingCode} allo staff all'arrivo.`;
}

// ─── Handler principale ───────────────────────────────────────────────────────

export async function POST(request: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return Response.json({ error: "ANTHROPIC_API_KEY mancante" }, { status: 503 });

  const { messages, establishmentId, role } = await request.json() as {
    messages: { role: "user" | "assistant"; content: string }[];
    establishmentId: string;
    role: "admin" | "client";
  };

  if (!messages?.length) return Response.json({ error: "Messaggi mancanti" }, { status: 400 });

  // Contesto completo dello stabilimento (servizi, prezzi, orari, telefono, ecc.)
  const estContext = establishmentId ? await buildEstablishmentContext(establishmentId) : "";

  // Statistiche live per l'admin
  let adminContext = "";
  if (role === "admin" && establishmentId) {
    const today = new Date().toISOString().split("T")[0];
    const db = adminSupabase();
    const { count } = await db
      .from("bookings").select("*", { count: "exact", head: true })
      .eq("establishment_id", establishmentId)
      .gte("start_date", today).lte("start_date", today);
    adminContext = `\nPrenotazioni attive oggi: ${count || 0}.`;
  }

  const systemPrompt = role === "admin"
    ? `Sei l'assistente AI per il gestore di questo stabilimento balneare. Rispondi in italiano, conciso e professionale. Niente emoji.\n\n${estContext}${adminContext}`
    : `Sei l'assistente virtuale di questo stabilimento balneare. Aiuti i clienti a prenotare un ombrellone.

Hai già tutte le informazioni sullo stabilimento qui sotto — non inventare nulla, rispondi solo in base a questi dati.
Per disponibilità usa get_availability. Per creare la prenotazione usa create_booking.

FLUSSO DI PRENOTAZIONE:
1. Chiedi le date desiderate
2. Usa get_availability per verificare la disponibilità
3. Mostra i posti liberi con il prezzo (ricavalo dalle tariffe qui sotto)
4. Chiedi nome, telefono ed EMAIL del cliente (tutti e tre obbligatori)
5. Riepilogo e chiedi conferma esplicita
6. Usa create_booking per confermare (passa sempre guest_email)
7. Comunica il codice prenotazione e di che il QR code arriverà via email

Rispondi sempre in italiano. Non usare emoji. Non suggerire mai di telefonare o scrivere email per prenotare.

${estContext}`;

  const tools = role === "client"
    ? [TOOL_GET_AVAILABILITY, TOOL_CREATE_BOOKING]
    : [];

  const loopMessages: AnthropicMessage[] = messages.map((m) => ({ role: m.role, content: m.content }));
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
      return Response.json({ error: `Errore API: ${res.status}` }, { status: 500 });
    }

    const data = await res.json() as { stop_reason: string; content: ContentBlock[] };

    if (data.stop_reason === "end_turn" || data.stop_reason !== "tool_use") {
      const text = data.content
        .filter((b): b is TextBlock => b.type === "text")
        .map((b) => b.text)
        .join("\n");
      return Response.json({ response: text });
    }

    // Esegui tool calls
    const toolResults: ToolResultBlock[] = [];
    for (const block of data.content) {
      if (block.type === "tool_use") {
        let result: string;
        if (block.name === "get_availability") result = await runGetAvailability(block.input, establishmentId);
        else if (block.name === "create_booking") result = await runCreateBooking(block.input, establishmentId);
        else result = "Tool non riconosciuto.";
        toolResults.push({ type: "tool_result", tool_use_id: block.id, content: result });
      }
    }

    loopMessages.push(
      { role: "assistant", content: data.content },
      { role: "user", content: toolResults as unknown as ContentBlock[] }
    );
  }

  return Response.json({ response: "Non ho potuto completare l'operazione. Riprova." });
}

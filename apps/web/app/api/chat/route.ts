import { createClient } from "@/lib/supabase/server";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || "",
});

export async function POST(request: Request) {
  const { message, establishmentId, role } = await request.json();

  if (!message) {
    return Response.json({ error: "Messaggio mancante" }, { status: 400 });
  }

  const supabase = await createClient();

  // Fetch establishment context
  let context = "";
  if (establishmentId) {
    const { data: est } = await supabase
      .from("establishments")
      .select("name, description, city, phone, email, check_in_time, check_out_time")
      .eq("id", establishmentId)
      .single();

    if (est) {
      context += `Stabilimento: ${est.name}, ${est.city}. `;
      if (est.description) context += `Descrizione: ${est.description}. `;
      context += `Orari: ${est.check_in_time}-${est.check_out_time}. `;
      if (est.phone) context += `Telefono: ${est.phone}. `;
      if (est.email) context += `Email: ${est.email}. `;
    }

    // Today's stats for admin
    if (role === "admin") {
      const today = new Date().toISOString().split("T")[0];
      const { count: bookingsToday } = await supabase
        .from("bookings")
        .select("*", { count: "exact", head: true })
        .eq("establishment_id", establishmentId)
        .gte("start_date", today)
        .lte("start_date", today);

      const { count: totalElements } = await supabase
        .from("map_elements")
        .select("*", { count: "exact", head: true })
        .in(
          "map_row_id",
          (
            await supabase
              .from("map_rows")
              .select("id")
              .in(
                "beach_map_id",
                (
                  await supabase
                    .from("beach_maps")
                    .select("id")
                    .eq("establishment_id", establishmentId)
                ).data?.map((m) => m.id) || []
              )
          ).data?.map((r) => r.id) || []
        );

      context += `Prenotazioni oggi: ${bookingsToday || 0}. Posti totali: ${totalElements || 0}. `;
    }

    // Available umbrellas for client queries
    if (role === "client") {
      const { data: maps } = await supabase
        .from("beach_maps")
        .select("id")
        .eq("establishment_id", establishmentId)
        .eq("is_active", true);

      if (maps && maps.length > 0) {
        const { data: rows } = await supabase
          .from("map_rows")
          .select("id, label, row_number")
          .eq("beach_map_id", maps[0].id)
          .order("row_number");

        if (rows) {
          const rowInfo = rows.map((r) => `${r.label}: fila ${r.row_number}`);
          context += `File disponibili: ${rowInfo.join(", ")}. `;
        }
      }

      // Services
      const { data: services } = await supabase
        .from("additional_services")
        .select("name, price_cents")
        .eq("establishment_id", establishmentId)
        .eq("is_active", true);

      if (services && services.length > 0) {
        context += `Servizi: ${services.map((s) => `${s.name} (${(s.price_cents / 100).toFixed(2)}€)`).join(", ")}. `;
      }
    }
  }

  const systemPrompt =
    role === "admin"
      ? `Sei l'assistente AI di LidoFacile per il gestore dello stabilimento. Rispondi in italiano, in modo conciso e professionale. Puoi aiutare con statistiche, prenotazioni, gestione e consigli operativi. ${context}`
      : `Sei l'assistente AI dello stabilimento balneare. Rispondi in italiano, in modo amichevole e breve. Aiuta i clienti a trovare disponibilità, prenotare e scoprire i servizi. ${context}`;

  try {
    const response = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1024,
      system: systemPrompt,
      messages: [{ role: "user", content: message }],
    });

    const text =
      response.content[0].type === "text" ? response.content[0].text : "";

    return Response.json({ response: text });
  } catch (error) {
    console.error("Claude API error:", error);
    return Response.json(
      { error: "Errore nel servizio AI. Riprova." },
      { status: 500 }
    );
  }
}

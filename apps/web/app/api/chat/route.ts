import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return Response.json({ error: "ANTHROPIC_API_KEY non configurata" }, { status: 503 });
  }

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

    if (role === "admin") {
      const today = new Date().toISOString().split("T")[0];
      const { count: bookingsToday } = await supabase
        .from("bookings")
        .select("*", { count: "exact", head: true })
        .eq("establishment_id", establishmentId)
        .gte("start_date", today)
        .lte("start_date", today);
      context += `Prenotazioni oggi: ${bookingsToday || 0}. `;
    }

    if (role === "client") {
      const { data: services } = await supabase
        .from("additional_services")
        .select("name, price_cents")
        .eq("establishment_id", establishmentId)
        .eq("is_active", true);
      if (services && services.length > 0) {
        context += `Servizi disponibili: ${services.map((s) => `${s.name} (${(s.price_cents / 100).toFixed(2)}€)`).join(", ")}. `;
      }
    }
  }

  const systemPrompt =
    role === "admin"
      ? `Sei l'assistente AI di LidoFacile per il gestore. Rispondi in italiano, in modo conciso e professionale. Non usare emoji. ${context}`
      : `Sei l'assistente virtuale dello stabilimento balneare. Rispondi in italiano, in modo amichevole e breve. Non usare emoji. Il tuo unico scopo è rispondere a domande su prezzi, orari, servizi e disponibilità. NON puoi effettuare prenotazioni: per prenotare, di' sempre al cliente di usare il pulsante "Prenota" sulla pagina dello stabilimento. Non suggerire mai di telefonare o scrivere email. ${context}`;

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 512,
        system: systemPrompt,
        messages: [{ role: "user", content: message }],
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("Anthropic API error:", res.status, err);
      return Response.json({ error: `Errore API: ${res.status}` }, { status: 500 });
    }

    const data = await res.json();
    const text = data.content?.[0]?.text ?? "";
    return Response.json({ response: text });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("Fetch error:", msg);
    return Response.json({ error: `Errore connessione: ${msg}` }, { status: 500 });
  }
}

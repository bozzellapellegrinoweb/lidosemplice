import { createClient as createAdminClient } from "@supabase/supabase-js";
import { Resend } from "resend";

function adminSupabase() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

export async function POST(request: Request) {
  if (!process.env.RESEND_API_KEY) {
    return Response.json({ error: "RESEND_API_KEY non configurata" }, { status: 503 });
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  const { bookingId } = await request.json();

  if (!bookingId) {
    return Response.json({ error: "bookingId mancante" }, { status: 400 });
  }

  const supabase = adminSupabase();

  // Fetch booking with establishment
  const { data: booking } = await supabase
    .from("bookings")
    .select(`
      *,
      establishments(name, address, city, phone, email, check_in_time, check_out_time),
      booking_items(
        map_element_id,
        sunbeds_count,
        price_cents,
        map_elements(label, element_type)
      ),
      booking_services(
        quantity,
        price_cents,
        additional_services(name)
      )
    `)
    .eq("id", bookingId)
    .single();

  if (!booking) {
    return Response.json({ error: "Prenotazione non trovata" }, { status: 404 });
  }

  const est = booking.establishments as unknown as {
    name: string;
    address: string;
    city: string;
    phone: string;
    email: string;
    check_in_time: string;
    check_out_time: string;
  };

  const ELEMENT_TYPE_LABELS: Record<string, string> = {
    umbrella: "Ombrellone",
    cabana: "Cabana",
    gazebo: "Gazebo",
    sunbed: "Lettino",
  };

  const ELEMENT_CAP_LABELS: Record<string, string> = {
    umbrella: "lettini",
    cabana: "persone",
    gazebo: "persone",
    sunbed: "posti",
  };

  const items = booking.booking_items as unknown as {
    sunbeds_count: number;
    price_cents: number;
    map_elements: { label: string; element_type: string };
  }[];

  const services = booking.booking_services as unknown as {
    quantity: number;
    price_cents: number;
    additional_services: { name: string };
  }[];

  // Build email HTML
  const itemsHtml = items
    .map(
      (item) => {
        const elType = item.map_elements?.element_type || "umbrella";
        const typeLabel = ELEMENT_TYPE_LABELS[elType] || "Ombrellone";
        const capLabel = ELEMENT_CAP_LABELS[elType] || "lettini";
        return `<tr>
          <td style="padding: 8px; border-bottom: 1px solid #eee;">${typeLabel} ${item.map_elements?.label || "?"} (${item.sunbeds_count} ${capLabel})</td>
          <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">${(item.price_cents / 100).toFixed(2)}€</td>
        </tr>`;
      }
    )
    .join("");

  const servicesHtml = services
    .map(
      (s) =>
        `<tr>
          <td style="padding: 8px; border-bottom: 1px solid #eee;">${s.additional_services?.name || "Servizio"} x${s.quantity}</td>
          <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">${(s.price_cents / 100).toFixed(2)}€</td>
        </tr>`
    )
    .join("");

  const html = `
    <!DOCTYPE html>
    <html>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
      <div style="background: linear-gradient(135deg, #00F0B5, #00BFFF, #2563EB); padding: 30px; border-radius: 12px; text-align: center; margin-bottom: 24px;">
        <h1 style="color: white; margin: 0; font-size: 24px;">Prenotazione Confermata!</h1>
        <p style="color: rgba(255,255,255,0.8); margin: 8px 0 0 0;">Codice: <strong>${booking.booking_code}</strong></p>
      </div>

      <p>Ciao <strong>${booking.guest_name}</strong>,</p>
      <p>La tua prenotazione presso <strong>${est.name}</strong> è confermata.</p>

      <div style="background: #f8f9fa; padding: 16px; border-radius: 8px; margin: 16px 0;">
        <p style="margin: 4px 0;"><strong>📅 Date:</strong> ${booking.start_date} → ${booking.end_date}</p>
        <p style="margin: 4px 0;"><strong>⏰ Orario:</strong> ${est.check_in_time} - ${est.check_out_time}</p>
        <p style="margin: 4px 0;"><strong>📍 Indirizzo:</strong> ${est.address || ""}, ${est.city || ""}</p>
        ${est.phone ? `<p style="margin: 4px 0;"><strong>📞 Telefono:</strong> <a href="tel:${est.phone}" style="color: #2563EB;">${est.phone}</a></p>` : ""}
        ${est.email ? `<p style="margin: 4px 0;"><strong>✉️ Email:</strong> <a href="mailto:${est.email}" style="color: #2563EB;">${est.email}</a></p>` : ""}
        <p style="margin: 8px 0 4px 0;">
          <a href="https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent((est.address || "") + ", " + (est.city || ""))}"
             target="_blank"
             style="display: inline-block; background: #2563EB; color: white; padding: 8px 16px; border-radius: 6px; text-decoration: none; font-size: 14px; font-weight: 500;">
            🗺️ Indicazioni stradali
          </a>
        </p>
      </div>

      <h3 style="margin-top: 24px;">Dettagli prenotazione</h3>
      <table style="width: 100%; border-collapse: collapse;">
        ${itemsHtml}
        ${servicesHtml}
        <tr style="font-weight: bold; background: #f8f9fa;">
          <td style="padding: 12px 8px;">Totale</td>
          <td style="padding: 12px 8px; text-align: right;">${(booking.total_cents / 100).toFixed(2)}€</td>
        </tr>
      </table>

      ${booking.qr_code_token ? `
      <div style="text-align: center; margin: 24px 0;">
        <p style="font-size: 14px; color: #666;">Mostra questo codice QR al check-in:</p>
        <img src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${booking.qr_code_token}" alt="QR Code" style="width: 200px; height: 200px;" />
        <p style="font-size: 12px; color: #999; margin-top: 8px;">Token: ${booking.qr_code_token}</p>
      </div>
      ` : ""}

      <p style="color: #666; font-size: 14px; margin-top: 24px;">
        Per qualsiasi domanda siamo a tua disposizione.
      </p>

      <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
      <p style="text-align: center; font-size: 12px; color: #999;">
        ${est.name} · Gestito con <a href="https://lido-facile.it" style="color: #00BFFF;">LidoFacile.it</a>
      </p>
    </body>
    </html>
  `;

  try {
    await resend.emails.send({
      from: `${est.name} <noreply@lido-facile.it>`,
      to: [booking.guest_email],
      subject: `Prenotazione confermata - ${booking.booking_code} | ${est.name}`,
      html,
    });

    return Response.json({ success: true });
  } catch (error) {
    console.error("Email send error:", error);
    return Response.json(
      { error: "Errore nell'invio dell'email" },
      { status: 500 }
    );
  }
}

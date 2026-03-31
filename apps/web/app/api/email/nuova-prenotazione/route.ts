import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

function adminSupabase() {
  return createClient(
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

  const db = adminSupabase();

  const { data: booking } = await db
    .from("bookings")
    .select(`
      *,
      establishments(name, email, slug),
      booking_items(
        sunbeds_count,
        price_cents,
        map_elements(label, element_type)
      )
    `)
    .eq("id", bookingId)
    .single();

  if (!booking) {
    return Response.json({ error: "Prenotazione non trovata" }, { status: 404 });
  }

  const est = booking.establishments as unknown as {
    name: string;
    email: string;
    slug: string;
  };

  if (!est.email) {
    return Response.json({ success: true, skipped: "nessuna email stabilimento" });
  }

  const ELEMENT_TYPE_LABELS: Record<string, string> = {
    umbrella: "Ombrellone",
    cabana: "Cabana",
    gazebo: "Gazebo",
    sunbed: "Lettino",
  };

  const items = booking.booking_items as unknown as {
    sunbeds_count: number;
    price_cents: number;
    map_elements: { label: string; element_type: string };
  }[];

  const itemsSummary = items
    .map((item) => {
      const typeLabel = ELEMENT_TYPE_LABELS[item.map_elements?.element_type || "umbrella"] || "Ombrellone";
      return `${typeLabel} ${item.map_elements?.label || "?"}`;
    })
    .join(", ");

  const dashboardUrl = `https://lido-facile.it/dashboard/${est.slug}/prenotazioni`;

  const paymentLabel: Record<string, string> = {
    onsite: "In loco",
    stripe: "Carta di credito",
    cash: "Contanti",
  };

  const html = `
    <!DOCTYPE html>
    <html>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
      <div style="background: linear-gradient(135deg, #0B1829, #1a3a5c); padding: 30px; border-radius: 12px; text-align: center; margin-bottom: 24px;">
        <p style="color: rgba(255,255,255,0.6); margin: 0 0 8px 0; font-size: 13px; text-transform: uppercase; letter-spacing: 1px;">Nuova prenotazione online</p>
        <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 800;">${booking.booking_code}</h1>
        <p style="color: #00F0B5; margin: 8px 0 0 0; font-size: 16px;">${booking.guest_name}</p>
      </div>

      <div style="background: #f8f9fa; padding: 20px; border-radius: 10px; margin: 20px 0; border-left: 4px solid #00BFFF;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 6px 0; color: #666; font-size: 14px; width: 120px;">Cliente</td>
            <td style="padding: 6px 0; font-weight: 600;">${booking.guest_name}</td>
          </tr>
          ${booking.guest_phone ? `<tr>
            <td style="padding: 6px 0; color: #666; font-size: 14px;">Telefono</td>
            <td style="padding: 6px 0;">${booking.guest_phone}</td>
          </tr>` : ""}
          ${booking.guest_email ? `<tr>
            <td style="padding: 6px 0; color: #666; font-size: 14px;">Email</td>
            <td style="padding: 6px 0;">${booking.guest_email}</td>
          </tr>` : ""}
          <tr>
            <td style="padding: 6px 0; color: #666; font-size: 14px;">Date</td>
            <td style="padding: 6px 0; font-weight: 600;">${booking.start_date} → ${booking.end_date}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #666; font-size: 14px;">Elementi</td>
            <td style="padding: 6px 0;">${itemsSummary || "—"}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #666; font-size: 14px;">Totale</td>
            <td style="padding: 6px 0; font-weight: 700; color: #0B1829; font-size: 18px;">${(booking.total_cents / 100).toFixed(2)}€</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #666; font-size: 14px;">Pagamento</td>
            <td style="padding: 6px 0;">${paymentLabel[booking.payment_method] || booking.payment_method}</td>
          </tr>
        </table>
      </div>

      <div style="text-align: center; margin: 28px 0;">
        <a href="${dashboardUrl}" style="background: #0B1829; color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 15px; display: inline-block;">
          Vai alla dashboard
        </a>
      </div>

      <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
      <p style="text-align: center; font-size: 12px; color: #999;">
        ${est.name} · Gestito con <a href="https://lido-facile.it" style="color: #00BFFF;">LidoFacile.it</a>
      </p>
    </body>
    </html>
  `;

  try {
    await resend.emails.send({
      from: `LidoFacile <noreply@lido-facile.it>`,
      to: [est.email],
      subject: `Nuova prenotazione ${booking.booking_code} — ${booking.guest_name}`,
      html,
    });

    return Response.json({ success: true });
  } catch (error) {
    console.error("Email nuova prenotazione error:", error);
    return Response.json({ error: "Errore nell'invio dell'email" }, { status: 500 });
  }
}

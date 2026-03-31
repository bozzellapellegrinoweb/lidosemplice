import { Resend } from "resend";

export async function POST(request: Request) {
  if (!process.env.RESEND_API_KEY) {
    return Response.json({ error: "RESEND_API_KEY non configurata" }, { status: 503 });
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  const { email, full_name, establishment_name, slug, days_left } = await request.json() as {
    email: string;
    full_name: string;
    establishment_name: string;
    slug: string;
    days_left: number;
  };

  if (!email || !establishment_name || !slug) {
    return Response.json({ error: "Parametri mancanti" }, { status: 400 });
  }

  const abbonatiUrl = `https://lido-facile.it/abbonati?slug=${slug}`;
  const isLastDay = days_left <= 1;

  const urgencyColor = isLastDay ? "#e53e3e" : "#f6ad55";
  const urgencyBg = isLastDay ? "#fff5f5" : "#fffaf0";
  const urgencyBorder = isLastDay ? "#e53e3e" : "#f6ad55";

  const subject = isLastDay
    ? `⚠️ Ultimo giorno di prova — ${establishment_name}`
    : `Il tuo periodo di prova scade tra ${days_left} giorni`;

  const html = `
    <!DOCTYPE html>
    <html>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
      <div style="background: linear-gradient(135deg, #00F0B5, #00BFFF, #2563EB); padding: 30px; border-radius: 12px; text-align: center; margin-bottom: 24px;">
        <h1 style="color: white; margin: 0; font-size: 22px;">
          ${isLastDay ? "Ultimo giorno di prova!" : `Mancano ${days_left} giorni alla fine della prova`}
        </h1>
      </div>

      <p style="font-size: 16px;">Ciao ${full_name ? `<strong>${full_name}</strong>` : ""},</p>

      <div style="background: ${urgencyBg}; padding: 16px 20px; border-radius: 8px; border-left: 4px solid ${urgencyBorder}; margin: 20px 0;">
        <p style="margin: 0; color: ${urgencyColor}; font-weight: 600;">
          ${isLastDay
            ? `La prova gratuita di ${establishment_name} scade oggi.`
            : `La prova gratuita di ${establishment_name} scade tra ${days_left} giorni.`
          }
        </p>
        <p style="margin: 8px 0 0 0; font-size: 14px; color: #555;">
          Attiva l'abbonamento annuale a <strong>497€</strong> per continuare a usare LidoFacile senza interruzioni.
        </p>
      </div>

      <p style="font-size: 15px; line-height: 1.6; color: #444;">
        Con LidoFacile gestisci la tua spiaggia da un'unica piattaforma:
        prenotazioni online, mappa interattiva, ordini bar, QR check-in e molto altro.
        <strong>Zero commissioni</strong> sulle prenotazioni dei tuoi clienti.
      </p>

      <div style="text-align: center; margin: 32px 0;">
        <a href="${abbonatiUrl}" style="background: #0B1829; color: white; text-decoration: none; padding: 16px 36px; border-radius: 8px; font-weight: 700; font-size: 16px; display: inline-block;">
          Attiva ora a 497€/anno
        </a>
      </div>

      <p style="font-size: 13px; color: #999; text-align: center;">
        Domande? Scrivici a <a href="mailto:info@lido-facile.it" style="color: #00BFFF;">info@lido-facile.it</a>
      </p>

      <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
      <p style="text-align: center; font-size: 12px; color: #999;">
        <a href="https://lido-facile.it" style="color: #00BFFF; text-decoration: none; font-weight: 600;">LidoFacile.it</a>
        · Il gestionale per il tuo stabilimento balneare
      </p>
    </body>
    </html>
  `;

  try {
    await resend.emails.send({
      from: `LidoFacile <noreply@lido-facile.it>`,
      to: [email],
      subject,
      html,
    });
    return Response.json({ success: true });
  } catch (error) {
    console.error("Email trial-reminder error:", error);
    return Response.json({ error: "Errore invio email" }, { status: 500 });
  }
}

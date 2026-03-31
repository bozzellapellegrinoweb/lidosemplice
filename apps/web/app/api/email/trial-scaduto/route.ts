import { Resend } from "resend";

export async function POST(request: Request) {
  if (!process.env.RESEND_API_KEY) {
    return Response.json({ error: "RESEND_API_KEY non configurata" }, { status: 503 });
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  const { email, full_name, establishment_name, slug } = await request.json() as {
    email: string;
    full_name: string;
    establishment_name: string;
    slug: string;
  };

  if (!email || !establishment_name || !slug) {
    return Response.json({ error: "Parametri mancanti" }, { status: 400 });
  }

  const abbonatiUrl = `https://lido-facile.it/abbonati?slug=${slug}`;

  const html = `
    <!DOCTYPE html>
    <html>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
      <div style="background: #1a1a2e; padding: 30px; border-radius: 12px; text-align: center; margin-bottom: 24px;">
        <h1 style="color: white; margin: 0; font-size: 22px;">Il periodo di prova è scaduto</h1>
        <p style="color: rgba(255,255,255,0.6); margin: 8px 0 0 0;">${establishment_name}</p>
      </div>

      <p style="font-size: 16px;">Ciao ${full_name ? `<strong>${full_name}</strong>` : ""},</p>

      <p style="font-size: 15px; line-height: 1.6; color: #444;">
        Il tuo periodo di prova gratuita per <strong>${establishment_name}</strong> è scaduto.
        La dashboard è temporaneamente disattivata, ma tutti i tuoi dati (mappa, prenotazioni, clienti) sono al sicuro.
      </p>

      <div style="background: #f8f9fa; padding: 20px; border-radius: 10px; margin: 24px 0; text-align: center;">
        <p style="margin: 0 0 4px 0; font-size: 14px; color: #666;">Abbonamento annuale</p>
        <div style="font-size: 40px; font-weight: 900; color: #0B1829;">497€</div>
        <p style="margin: 4px 0 0 0; font-size: 13px; color: #999;">IVA inclusa · Zero commissioni · Rinnovo annuale</p>
      </div>

      <div style="text-align: center; margin: 32px 0;">
        <a href="${abbonatiUrl}" style="background: linear-gradient(135deg, #00F0B5, #00BFFF); color: #0B1829; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-weight: 800; font-size: 17px; display: inline-block;">
          Riattiva subito
        </a>
      </div>

      <p style="font-size: 13px; color: #999; text-align: center;">
        Hai bisogno di aiuto o vuoi discutere condizioni particolari?<br>
        <a href="mailto:info@lido-facile.it" style="color: #00BFFF;">info@lido-facile.it</a>
      </p>

      <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
      <p style="text-align: center; font-size: 12px; color: #999;">
        <a href="https://lido-facile.it" style="color: #00BFFF; text-decoration: none; font-weight: 600;">LidoFacile.it</a>
      </p>
    </body>
    </html>
  `;

  try {
    await resend.emails.send({
      from: `LidoFacile <noreply@lido-facile.it>`,
      to: [email],
      subject: `La prova di ${establishment_name} è scaduta — Riattiva LidoFacile`,
      html,
    });
    return Response.json({ success: true });
  } catch (error) {
    console.error("Email trial-scaduto error:", error);
    return Response.json({ error: "Errore invio email" }, { status: 500 });
  }
}

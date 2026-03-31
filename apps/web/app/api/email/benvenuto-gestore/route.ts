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

  if (!email || !full_name || !establishment_name || !slug) {
    return Response.json({ error: "Parametri mancanti" }, { status: 400 });
  }

  const dashboardUrl = `https://lido-facile.it/dashboard/${slug}`;

  const html = `
    <!DOCTYPE html>
    <html>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
      <div style="background: linear-gradient(135deg, #00F0B5, #00BFFF, #2563EB); padding: 40px 30px; border-radius: 12px; text-align: center; margin-bottom: 24px;">
        <h1 style="color: white; margin: 0 0 8px 0; font-size: 26px; font-weight: 800;">Benvenuto su LidoFacile!</h1>
        <p style="color: rgba(255,255,255,0.85); margin: 0; font-size: 16px;">Il tuo stabilimento è online</p>
      </div>

      <p style="font-size: 16px;">Ciao <strong>${full_name}</strong>,</p>
      <p style="font-size: 15px; line-height: 1.6;">
        Il tuo account per <strong>${establishment_name}</strong> è stato creato con successo.<br>
        Hai <strong>14 giorni di prova gratuita</strong> per esplorare tutte le funzionalità.
      </p>

      <div style="margin: 24px 0;">
        <h3 style="font-size: 15px; color: #0B1829; margin-bottom: 12px;">Cosa puoi fare da subito:</h3>
        <div style="border-left: 3px solid #00F0B5; padding-left: 16px; margin-bottom: 10px;">
          <p style="margin: 4px 0; font-size: 14px;"><strong>Configura la mappa</strong> — disegna la tua spiaggia con ombrelloni, cabane e lettini</p>
        </div>
        <div style="border-left: 3px solid #00BFFF; padding-left: 16px; margin-bottom: 10px;">
          <p style="margin: 4px 0; font-size: 14px;"><strong>Imposta i prezzi</strong> — stagioni, file e durate per ogni tipo di posto</p>
        </div>
        <div style="border-left: 3px solid #2563EB; padding-left: 16px; margin-bottom: 10px;">
          <p style="margin: 4px 0; font-size: 14px;"><strong>Aggiungi i dipendenti</strong> — crea account per il tuo staff con permessi personalizzati</p>
        </div>
        <div style="border-left: 3px solid #0B1829; padding-left: 16px;">
          <p style="margin: 4px 0; font-size: 14px;"><strong>Condividi la pagina pubblica</strong> — i clienti prenota direttamente online</p>
        </div>
      </div>

      <div style="text-align: center; margin: 32px 0;">
        <a href="${dashboardUrl}" style="background: #0B1829; color: white; text-decoration: none; padding: 16px 36px; border-radius: 8px; font-weight: 700; font-size: 16px; display: inline-block;">
          Vai alla dashboard
        </a>
      </div>

      <div style="background: #f8f9fa; padding: 16px 20px; border-radius: 8px; margin: 20px 0;">
        <p style="margin: 0; font-size: 14px; color: #555;">
          Hai bisogno di aiuto? Scrivici a
          <a href="mailto:info@lido-facile.it" style="color: #00BFFF;">info@lido-facile.it</a>
          — rispondiamo entro poche ore.
        </p>
      </div>

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
      subject: `Benvenuto su LidoFacile — ${establishment_name} è online!`,
      html,
    });

    return Response.json({ success: true });
  } catch (error) {
    console.error("Email benvenuto gestore error:", error);
    return Response.json({ error: "Errore nell'invio dell'email" }, { status: 500 });
  }
}

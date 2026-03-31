import { Resend } from "resend";

export async function POST(request: Request) {
  if (!process.env.RESEND_API_KEY) {
    return Response.json({ error: "RESEND_API_KEY non configurata" }, { status: 503 });
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  const { email, full_name, establishment_name, password } = await request.json() as {
    email: string;
    full_name: string;
    establishment_name: string;
    password: string;
  };

  if (!email || !full_name || !establishment_name || !password) {
    return Response.json({ error: "Parametri mancanti" }, { status: 400 });
  }

  const loginUrl = "https://lido-facile.it/auth/login";

  const html = `
    <!DOCTYPE html>
    <html>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
      <div style="background: linear-gradient(135deg, #00F0B5, #00BFFF, #2563EB); padding: 30px; border-radius: 12px; text-align: center; margin-bottom: 24px;">
        <h1 style="color: white; margin: 0; font-size: 24px;">Benvenuto in LidoFacile!</h1>
        <p style="color: rgba(255,255,255,0.85); margin: 8px 0 0 0;">Il tuo account è pronto</p>
      </div>

      <p style="font-size: 16px;">Ciao <strong>${full_name}</strong>,</p>
      <p>Sei stato aggiunto come dipendente di <strong>${establishment_name}</strong>. Ecco i tuoi dati di accesso:</p>

      <div style="background: #f8f9fa; padding: 20px; border-radius: 10px; margin: 20px 0; border-left: 4px solid #00F0B5;">
        <p style="margin: 8px 0; font-size: 15px;"><strong>Email:</strong> ${email}</p>
        <p style="margin: 8px 0; font-size: 15px;"><strong>Password temporanea:</strong> <code style="background: #e9ecef; padding: 2px 8px; border-radius: 4px; font-size: 15px;">${password}</code></p>
      </div>

      <p style="color: #e53e3e; font-size: 14px; background: #fff5f5; padding: 12px 16px; border-radius: 8px; border-left: 3px solid #e53e3e;">
        Modifica la tua password al primo accesso per sicurezza.
      </p>

      <div style="text-align: center; margin: 28px 0;">
        <a href="${loginUrl}" style="background: #0B1829; color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 15px; display: inline-block;">
          Accedi ora
        </a>
      </div>

      <p style="color: #666; font-size: 14px;">
        Se hai problemi ad accedere, contatta il responsabile dello stabilimento.
      </p>

      <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
      <p style="text-align: center; font-size: 12px; color: #999;">
        ${establishment_name} · Gestito con <a href="https://lido-facile.it" style="color: #00BFFF;">LidoFacile.it</a>
      </p>
    </body>
    </html>
  `;

  try {
    await resend.emails.send({
      from: `${establishment_name} <noreply@lido-facile.it>`,
      to: [email],
      subject: `Accesso a LidoFacile — ${establishment_name}`,
      html,
    });

    return Response.json({ success: true });
  } catch (error) {
    console.error("Email benvenuto dipendente error:", error);
    return Response.json({ error: "Errore nell'invio dell'email" }, { status: 500 });
  }
}

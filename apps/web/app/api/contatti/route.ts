import { Resend } from "resend";

export async function POST(request: Request) {
  const { nome, email, messaggio } = await request.json();

  if (!nome || !email || !messaggio) {
    return Response.json({ error: "Parametri mancanti" }, { status: 400 });
  }

  if (!process.env.RESEND_API_KEY) {
    return Response.json({ error: "Email non configurata" }, { status: 503 });
  }

  const resend = new Resend(process.env.RESEND_API_KEY);

  await resend.emails.send({
    from: "LidoFacile <noreply@lido-facile.it>",
    to: ["info@lido-facile.it"],
    replyTo: email,
    subject: `Nuovo messaggio da ${nome} — LidoFacile`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px;">
        <h2 style="color:#0B1829;">Nuovo messaggio dal form contatti</h2>
        <table style="width:100%;border-collapse:collapse;">
          <tr><td style="padding:8px 0;color:#64748b;width:100px;">Nome</td><td style="padding:8px 0;font-weight:600;">${nome}</td></tr>
          <tr><td style="padding:8px 0;color:#64748b;">Email</td><td style="padding:8px 0;"><a href="mailto:${email}">${email}</a></td></tr>
        </table>
        <div style="margin-top:16px;background:#f8fafc;border-radius:8px;padding:16px;">
          <p style="margin:0;white-space:pre-wrap;">${messaggio}</p>
        </div>
        <hr style="margin:24px 0;border:none;border-top:1px solid #e2e8f0;"/>
        <p style="font-size:12px;color:#94a3b8;">LidoFacile.it — form contatti</p>
      </div>
    `,
  });

  return Response.json({ success: true });
}

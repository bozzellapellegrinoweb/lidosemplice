export async function POST(request: Request) {
  const { establishmentId } = await request.json();
  if (!establishmentId) {
    return Response.json({ error: "establishmentId mancante" }, { status: 400 });
  }

  // Ottieni access token PayPal
  const tokenRes = await fetch("https://api-m.paypal.com/v1/oauth2/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(
        `${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_SECRET}`
      ).toString("base64")}`,
    },
    body: "grant_type=client_credentials",
  });

  const tokenData = await tokenRes.json();
  if (!tokenData.access_token) {
    return Response.json({ error: "Errore autenticazione PayPal" }, { status: 500 });
  }

  // Crea ordine PayPal
  const orderRes = await fetch("https://api-m.paypal.com/v2/checkout/orders", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${tokenData.access_token}`,
    },
    body: JSON.stringify({
      intent: "CAPTURE",
      purchase_units: [
        {
          reference_id: establishmentId,
          description: "LidoFacile — Abbonamento annuale",
          amount: {
            currency_code: "EUR",
            value: "497.00",
          },
          custom_id: establishmentId,
        },
      ],
      application_context: {
        brand_name: "LidoFacile",
        locale: "it-IT",
        user_action: "PAY_NOW",
      },
    }),
  });

  const orderData = await orderRes.json();
  if (!orderData.id) {
    console.error("PayPal order error:", orderData);
    return Response.json({ error: "Errore creazione ordine PayPal" }, { status: 500 });
  }

  return Response.json({ orderId: orderData.id });
}

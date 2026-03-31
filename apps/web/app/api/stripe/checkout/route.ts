import Stripe from "stripe";

export async function POST(request: Request) {
  const { establishmentId, slug, email } = await request.json() as {
    establishmentId: string;
    slug: string;
    email?: string;
  };

  if (!establishmentId || !slug) {
    return Response.json({ error: "Parametri mancanti" }, { status: 400 });
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://lido-facile.it";

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price: process.env.STRIPE_PRICE_ID!, quantity: 1 }],
    client_reference_id: establishmentId,
    ...(email ? { customer_email: email } : {}),
    success_url: `${appUrl}/abbonati/success?slug=${slug}&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${appUrl}/abbonati?slug=${slug}&id=${establishmentId}`,
    locale: "it",
    metadata: { establishment_id: establishmentId, slug },
  });

  return Response.json({ url: session.url });
}

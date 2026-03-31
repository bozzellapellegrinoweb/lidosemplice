import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

function adminSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

const SATISPAY_BASE = process.env.SATISPAY_SANDBOX === "true"
  ? "https://staging.authservices.satispay.com"
  : "https://authservices.satispay.com";

/**
 * POST /api/satispay/activate
 * Body: { establishmentId: string; activationToken: string }
 *
 * Generates RSA-2048 key pair, activates it with Satispay using the
 * activation token from the gestore's Satispay Business app/portal,
 * and saves key_id + private_key to the establishment's payment_methods.
 */
export async function POST(req: Request) {
  const { establishmentId, activationToken } = await req.json();

  if (!establishmentId || !activationToken) {
    return Response.json({ error: "Parametri mancanti" }, { status: 400 });
  }

  // 1. Generate RSA-2048 key pair
  const { publicKey, privateKey } = crypto.generateKeyPairSync("rsa", {
    modulusLength: 2048,
    publicKeyEncoding: { type: "spki", format: "pem" },
    privateKeyEncoding: { type: "pkcs8", format: "pem" },
  });

  // 2. Activate with Satispay
  const body = JSON.stringify({ token: activationToken });
  const date = new Date().toUTCString();
  const host = new URL(SATISPAY_BASE).host;
  const path = "/g_business/v1/authentication_keys?flow=APP";

  const bodyDigest = crypto.createHash("sha256").update(body).digest("base64");
  const digest = `SHA-256=${bodyDigest}`;

  const signingString = [
    `(request-target): post ${path}`,
    `host: ${host}`,
    `date: ${date}`,
    `digest: ${digest}`,
  ].join("\n");

  const sign = crypto.createSign("RSA-SHA256");
  sign.update(signingString);
  const signature = sign.sign(privateKey, "base64");

  // For activation, we use the public key as keyId placeholder (Satispay returns real keyId)
  const authHeader = `Signature keyId="not-yet-assigned", algorithm="rsa-sha256", headers="(request-target) host date digest", signature="${signature}"`;

  let satispayRes: Response;
  try {
    satispayRes = await fetch(`${SATISPAY_BASE}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: authHeader,
        Date: date,
        Digest: digest,
        Host: host,
        // Satispay requires public key in a specific header during activation
        "x-satispay-response-body-signature": publicKey,
      },
      body,
    });
  } catch (e) {
    return Response.json({ error: "Impossibile contattare Satispay: " + String(e) }, { status: 502 });
  }

  const satispayData = await satispayRes.json().catch(() => ({}));

  if (!satispayRes.ok) {
    return Response.json(
      { error: satispayData.message ?? "Errore attivazione Satispay" },
      { status: 400 }
    );
  }

  const keyId: string = satispayData.key_id ?? satispayData.uid;
  if (!keyId) {
    return Response.json({ error: "Satispay non ha restituito un key_id" }, { status: 500 });
  }

  // 3. Save key_id + private_key to DB
  const db = adminSupabase();
  const { data: est } = await db
    .from("establishments")
    .select("payment_methods")
    .eq("id", establishmentId)
    .single();

  const pm = (est?.payment_methods ?? {}) as Record<string, unknown>;
  const existing = (pm.satispay ?? {}) as Record<string, unknown>;

  await db
    .from("establishments")
    .update({
      payment_methods: {
        ...pm,
        satispay: {
          ...existing,
          enabled: true,
          key_id: keyId,
          private_key: privateKey,
        },
      },
    })
    .eq("id", establishmentId);

  return Response.json({ success: true, key_id: keyId });
}

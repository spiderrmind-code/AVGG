import { createHmac, timingSafeEqual } from "crypto";

type SignatureCheck =
  | { valid: true }
  | { valid: false; reason: "missing_secret" | "missing_signature" | "invalid_signature" };

function readSignaturePart(signature: string, key: string): string | null {
  for (const part of signature.split(",")) {
    const [partKey, ...valueParts] = part.trim().split("=");
    if (partKey === key && valueParts.length > 0) {
      const value = valueParts.join("=").trim();
      return value || null;
    }
  }

  return null;
}

export function verifyMercadoPagoWebhookSignature(input: {
  paymentId: string;
  signature: string | null;
  requestId: string | null;
  secret: string | undefined;
}): SignatureCheck {
  if (!input.secret) return { valid: false, reason: "missing_secret" };
  if (!input.signature || !input.requestId) return { valid: false, reason: "missing_signature" };

  const timestamp = readSignaturePart(input.signature, "ts");
  const receivedSignature = readSignaturePart(input.signature, "v1");
  if (!timestamp || !receivedSignature || !/^[a-fA-F0-9]{64}$/.test(receivedSignature)) {
    return { valid: false, reason: "invalid_signature" };
  }

  // Mercado Pago's documented manifest: id:[data.id_url];request-id:[x-request-id_header];ts:[ts_header];
  const manifest = `id:${input.paymentId.toLowerCase()};request-id:${input.requestId};ts:${timestamp};`;
  const expectedSignature = createHmac("sha256", input.secret).update(manifest).digest("hex");
  const receivedBuffer = Buffer.from(receivedSignature, "hex");
  const expectedBuffer = Buffer.from(expectedSignature, "hex");

  if (receivedBuffer.length !== expectedBuffer.length || !timingSafeEqual(receivedBuffer, expectedBuffer)) {
    return { valid: false, reason: "invalid_signature" };
  }

  return { valid: true };
}

export function canAllowUnsignedMercadoPagoWebhook(): boolean {
  return process.env.NODE_ENV !== "production" && process.env.MERCADOPAGO_ALLOW_UNSIGNED_WEBHOOKS === "true";
}

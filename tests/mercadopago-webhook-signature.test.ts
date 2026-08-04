import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import test from "node:test";
import { verifyMercadoPagoWebhookSignature } from "../lib/mercadopago-webhook-signature";

const secret = "test-webhook-secret";
const paymentId = "123456789";
const requestId = "request-test-1";
const timestamp = "1704908010";
const manifest = `id:${paymentId};request-id:${requestId};ts:${timestamp};`;
const signature = createHmac("sha256", secret).update(manifest).digest("hex");

test("accepts an official Mercado Pago HMAC-SHA256 signature", () => {
  assert.deepEqual(verifyMercadoPagoWebhookSignature({ paymentId, requestId, secret, signature: `ts=${timestamp},v1=${signature}` }), { valid: true });
});

test("rejects invalid or missing webhook signatures", () => {
  assert.deepEqual(verifyMercadoPagoWebhookSignature({ paymentId, requestId, secret, signature: `ts=${timestamp},v1=${"0".repeat(64)}` }), { valid: false, reason: "invalid_signature" });
  assert.deepEqual(verifyMercadoPagoWebhookSignature({ paymentId, requestId, secret, signature: null }), { valid: false, reason: "missing_signature" });
  assert.deepEqual(verifyMercadoPagoWebhookSignature({ paymentId, requestId: null, secret, signature: `ts=${timestamp},v1=${signature}` }), { valid: false, reason: "missing_signature" });
  assert.deepEqual(verifyMercadoPagoWebhookSignature({ paymentId, requestId, secret, signature: `ts=not-a-timestamp,v1=${signature}` }), { valid: false, reason: "invalid_signature" });
});

test("rejects a missing webhook secret", () => {
  assert.deepEqual(verifyMercadoPagoWebhookSignature({ paymentId, requestId, secret: undefined, signature: `ts=${timestamp},v1=${signature}` }), { valid: false, reason: "missing_secret" });
});

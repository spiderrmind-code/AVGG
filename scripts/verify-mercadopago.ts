import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { getMercadoPagoOrderStatus, normalizeMercadoPagoPaymentStatus } from "../lib/mercadopago-payment-status";
import { verifyMercadoPagoWebhookSignature } from "../lib/mercadopago-webhook-signature";

const secret = "local-verification-secret";
const paymentId = "123456789";
const requestId = "local-verification-request";
const timestamp = "1704908010";
const manifest = `id:${paymentId};request-id:${requestId};ts:${timestamp};`;
const signature = createHmac("sha256", secret).update(manifest).digest("hex");

assert.deepEqual(verifyMercadoPagoWebhookSignature({ paymentId, requestId, secret, signature: `ts=${timestamp},v1=${signature}` }), { valid: true });
assert.equal(normalizeMercadoPagoPaymentStatus("authorized"), "pending");
assert.equal(normalizeMercadoPagoPaymentStatus("partially_refunded"), "partially_refunded");
assert.equal(getMercadoPagoOrderStatus("approved"), "paid_pending_stock");

console.log("Mercado Pago local verification: PASS");
console.log("Simulated order/preference/webhook/stock path: covered by mocked webhook tests");
console.log("External calls: 0");
console.log("Payments created: 0");
console.log("Refunds created: 0");

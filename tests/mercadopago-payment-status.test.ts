import assert from "node:assert/strict";
import test from "node:test";
import { canTransitionMercadoPagoPaymentStatus, getMercadoPagoOrderStatus, normalizeMercadoPagoPaymentStatus } from "../lib/mercadopago-payment-status";

test("normalizes all Mercado Pago statuses that affect an order", () => {
  assert.equal(normalizeMercadoPagoPaymentStatus("in_process"), "pending");
  assert.equal(normalizeMercadoPagoPaymentStatus("authorized"), "pending");
  assert.equal(normalizeMercadoPagoPaymentStatus("partially_refunded"), "partially_refunded");
  assert.equal(normalizeMercadoPagoPaymentStatus("unexpected"), "unknown");
  assert.equal(getMercadoPagoOrderStatus("charged_back"), "payment_failed");
});

test("does not allow stale Mercado Pago notifications to undo settled payments", () => {
  assert.equal(canTransitionMercadoPagoPaymentStatus("approved", "pending"), false);
  assert.equal(canTransitionMercadoPagoPaymentStatus("approved", "refunded"), true);
  assert.equal(canTransitionMercadoPagoPaymentStatus("partially_refunded", "refunded"), true);
  assert.equal(canTransitionMercadoPagoPaymentStatus("refunded", "approved"), false);
  assert.equal(canTransitionMercadoPagoPaymentStatus("charged_back", "approved"), false);
  assert.equal(canTransitionMercadoPagoPaymentStatus("cancelled", "approved"), true);
});

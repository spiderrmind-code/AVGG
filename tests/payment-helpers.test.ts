import assert from "node:assert/strict";
import test from "node:test";
import { canInitializePayment, getWebhookOrderUpdate, resolvePaymentOrigin } from "../lib/payment";

test("resolvePaymentOrigin prefers explicit origin and strips paths", () => {
  assert.equal(resolvePaymentOrigin("https://checkout.example.com/current", "https://store.example.com/checkout", "https://env.example.com"), "https://checkout.example.com");
  assert.equal(resolvePaymentOrigin("", "https://store.example.com/checkout", "https://env.example.com"), "https://store.example.com");
  assert.equal(resolvePaymentOrigin("", "", ""), "http://localhost:3000");
});

test("canInitializePayment only allows pending orders before approval", () => {
  assert.equal(canInitializePayment({ status: "pending", paymentStatus: "pending" }), true);
  assert.equal(canInitializePayment({ status: "pending", paymentStatus: "approved" }), false);
  assert.equal(canInitializePayment({ status: "processing", paymentStatus: "pending" }), false);
});

test("getWebhookOrderUpdate maps approved and rejected payments to visible order states", () => {
  assert.deepEqual(getWebhookOrderUpdate("approved"), { paymentStatus: "approved", status: "paid" });
  assert.deepEqual(getWebhookOrderUpdate("rejected"), { paymentStatus: "rejected", status: "cancelled" });
  assert.deepEqual(getWebhookOrderUpdate("pending"), { paymentStatus: "pending", status: "pending" });
});

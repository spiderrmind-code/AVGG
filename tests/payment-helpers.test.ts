import assert from "node:assert/strict";
import test from "node:test";
import { canInitializePayment, getWebhookOrderUpdate, resolvePaymentOrigin } from "../lib/payment";

test("resolvePaymentOrigin uses the configured public URL", () => {
  const original = process.env.NEXT_PUBLIC_APP_URL;
  process.env.NEXT_PUBLIC_APP_URL = "https://checkout.example.com/";
  assert.equal(resolvePaymentOrigin(), "https://checkout.example.com");
  if (original === undefined) delete process.env.NEXT_PUBLIC_APP_URL;
  else process.env.NEXT_PUBLIC_APP_URL = original;
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

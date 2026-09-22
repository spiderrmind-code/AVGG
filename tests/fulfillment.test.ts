import assert from "node:assert/strict";
import test from "node:test";
import { dropsheableProvider } from "../lib/fulfillment/dropsheable";
import { processPendingFulfillment } from "../lib/fulfillment/engine";
import { inspectFulfillmentOrder } from "../lib/fulfillment/reconcile";

test("Dropsheable adapter refuses undocumented order creation", async () => {
  const result = await dropsheableProvider.submitOrder({ _id: "order-1" });
  assert.equal(result.success, false);
  assert.equal(result.errorCode, "PROVIDER_CONTRACT_MISSING");
  assert.equal(result.retryable, false);
});

test("fulfillment lock prevents a duplicate attempt", async () => {
  let updateCalls = 0;
  const orders = {
    find: () => ({ sort: () => ({ limit: () => ({ toArray: async () => [{ _id: "order-1", paymentStatus: "approved", stockApplied: true, fulfillmentStatus: "pending" }] }) }) }),
    updateOne: async () => {
      updateCalls += 1;
      return { matchedCount: updateCalls === 1 ? 1 : 0 };
    },
  } as never;
  const provider = { submitOrder: async () => ({ success: false, errorCode: "PROVIDER_CONTRACT_MISSING", retryable: false }), getOrderStatus: async () => ({ success: false }) };
  const first = await processPendingFulfillment(orders, provider);
  const second = await processPendingFulfillment(orders, provider);
  assert.equal(first.blocked, 1);
  assert.equal(second.processed, 0);
  assert.equal(updateCalls, 3);
});

test("reconciliation detects stale payment, missing tracking and terminal conflicts", () => {
  const now = Date.now();
  const incidents = inspectFulfillmentOrder({
    paymentStatus: "approved",
    fulfillmentStatus: "pending",
    fulfillmentQueuedAt: new Date(now - 31 * 60 * 1000),
    stockIssue: true,
  }, now);
  assert.deepEqual(incidents.map((incident) => incident.code), ["PAYMENT_WITHOUT_FULFILLMENT", "STOCK_INSUFFICIENT"]);

  const trackingIncidents = inspectFulfillmentOrder({
    paymentStatus: "refunded",
    fulfillmentStatus: "shipped",
    fulfillmentSubmittedAt: new Date(now),
  }, now);
  assert.deepEqual(trackingIncidents.map((incident) => incident.code), ["SHIPPED_WITHOUT_TRACKING"]);

  const terminalIncident = inspectFulfillmentOrder({
    paymentStatus: "charged_back",
    fulfillmentStatus: "submitted",
    externalOrderId: "external-1",
    fulfillmentSubmittedAt: new Date(now - 61 * 60 * 1000),
  }, now);
  assert.deepEqual(terminalIncident.map((incident) => incident.code), ["TERMINAL_PAYMENT_PENDING_FULFILLMENT", "FULFILLMENT_CONFIRMATION_STALE"]);
});

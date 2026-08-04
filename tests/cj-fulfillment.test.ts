import assert from "node:assert/strict";
import test from "node:test";
import { ObjectId, type Document, type Filter, type UpdateFilter } from "mongodb";
import { CjFulfillmentTimeoutError, createSimulatedCjFulfillmentClient, getCjFulfillmentEligibility, isMonotonicCjTrackingTransition, recordCjTracking, submitCjFulfillment, type CjFulfillmentOrderStore } from "../lib/cj/fulfillment";
import { cjFulfillmentFixtureOrder } from "./fixtures/cj-fulfillment";

class InMemoryOrders implements CjFulfillmentOrderStore {
  readonly updates: Array<{ filter: Filter<Document>; update: UpdateFilter<Document> }> = [];
  constructor(private order: Document | null) {}

  async findOne(): Promise<Document | null> { return this.order; }

  async updateOne(filter: Filter<Document>, update: UpdateFilter<Document>): Promise<{ matchedCount: number }> {
    this.updates.push({ filter, update });
    if (!this.order) return { matchedCount: 0 };
    if ("fulfillmentProcessing" in filter && filter.fulfillmentProcessing === true && this.order.fulfillmentProcessing !== true) return { matchedCount: 0 };
    const set = "$set" in update ? update.$set : undefined;
    if (set && typeof set === "object") Object.assign(this.order, set);
    const unset = "$unset" in update ? update.$unset : undefined;
    if (unset && typeof unset === "object") for (const field of Object.keys(unset)) delete this.order[field];
    return { matchedCount: 1 };
  }
}

function fixtureDocument(): Document {
  return { ...cjFulfillmentFixtureOrder, _id: new ObjectId(cjFulfillmentFixtureOrder._id), customer: { ...cjFulfillmentFixtureOrder.customer }, items: cjFulfillmentFixtureOrder.items.map((item) => ({ ...item, _internal: { ...item._internal } })) };
}

test("maps only paid, stocked CJ orders to a supplier payload", () => {
  const eligible = getCjFulfillmentEligibility(fixtureDocument());
  assert.equal(eligible.eligible, true);
  if (eligible.eligible) {
    assert.equal(eligible.payload.orderReference, cjFulfillmentFixtureOrder._id);
    assert.deepEqual(eligible.payload.items, [{ cjId: "cj-product-1", quantity: 2, cjVariantId: "cj-variant-1", cjSku: "CJ-SKU-1" }]);
  }
  assert.deepEqual(getCjFulfillmentEligibility({ ...fixtureDocument(), paymentStatus: "pending" }), { eligible: false, reason: "payment_not_approved" });
  assert.deepEqual(getCjFulfillmentEligibility({ ...fixtureDocument(), stockApplied: false }), { eligible: false, reason: "stock_not_applied" });
  assert.deepEqual(getCjFulfillmentEligibility({ ...fixtureDocument(), customer: { ...cjFulfillmentFixtureOrder.customer, address: "" } }), { eligible: false, reason: "invalid_address" });
  assert.deepEqual(getCjFulfillmentEligibility({ ...fixtureDocument(), customer: { ...cjFulfillmentFixtureOrder.customer, countryCode: "" } }), { eligible: false, reason: "invalid_address" });
  assert.deepEqual(getCjFulfillmentEligibility({ ...fixtureDocument(), items: [{ ...cjFulfillmentFixtureOrder.items[0], _internal: { supplierId: "local" } }] }), { eligible: false, reason: "invalid_cj_items" });
  assert.deepEqual(getCjFulfillmentEligibility({ ...fixtureDocument(), items: [{ ...cjFulfillmentFixtureOrder.items[0], _internal: { ...cjFulfillmentFixtureOrder.items[0]._internal, cjSku: "" } }] }), { eligible: false, reason: "invalid_cj_items" });
});

test("reserves once, persists the generic supplier id, and is idempotent", async () => {
  const store = new InMemoryOrders(fixtureDocument());
  const first = await submitCjFulfillment(cjFulfillmentFixtureOrder._id, store, createSimulatedCjFulfillmentClient(), new Date(0));
  assert.deepEqual(first, { success: true, outcome: "submitted", supplierOrderId: `cj-sim-${cjFulfillmentFixtureOrder._id}` });
  assert.equal(store.updates.length, 2);
  assert.equal(store.updates[0].filter.paymentStatus, "approved");
  assert.equal(store.updates[0].filter.stockApplied, true);
  assert.equal(store.updates[0].update.$set?.fulfillmentProcessing, true);
  const second = await submitCjFulfillment(cjFulfillmentFixtureOrder._id, store, createSimulatedCjFulfillmentClient(), new Date(1));
  assert.deepEqual(second, { success: true, outcome: "already_submitted", supplierOrderId: `cj-sim-${cjFulfillmentFixtureOrder._id}` });
  assert.equal(store.updates.length, 2);
});

test("keeps an uncertain timeout out of automatic retry", async () => {
  const store = new InMemoryOrders(fixtureDocument());
  const client = { async createOrder() { throw new CjFulfillmentTimeoutError(); } };
  const result = await submitCjFulfillment(cjFulfillmentFixtureOrder._id, store, client, new Date(0));
  assert.deepEqual(result, { success: false, outcome: "timeout_uncertain" });
  assert.equal(store.updates.length, 2);
  assert.equal(store.updates[1].update.$set?.fulfillmentStatus, "unknown");
});

test("tracking transitions are monotonic and idempotent", async () => {
  const store = new InMemoryOrders({ ...fixtureDocument(), supplierOrderId: "cj-sim-order", fulfillmentStatus: "submitted" });
  assert.equal(isMonotonicCjTrackingTransition("submitted", "shipped"), true);
  assert.equal(isMonotonicCjTrackingTransition("shipped", "processing"), false);
  assert.deepEqual(await recordCjTracking(cjFulfillmentFixtureOrder._id, store, { status: "shipped", carrier: "Carrier simulado", trackingNumber: "TRACK-1" }, new Date(0)), { success: true, outcome: "applied" });
  assert.deepEqual(await recordCjTracking(cjFulfillmentFixtureOrder._id, store, { status: "processing", carrier: "Carrier simulado", trackingNumber: "TRACK-1" }, new Date(1)), { success: false, outcome: "invalid_transition" });
  assert.deepEqual(await recordCjTracking(cjFulfillmentFixtureOrder._id, store, { status: "shipped", carrier: "Carrier simulado", trackingNumber: "TRACK-1" }, new Date(2)), { success: true, outcome: "idempotent" });
});

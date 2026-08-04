import assert from "node:assert/strict";
import { mock } from "node:test";

const id = "507f1f77bcf86cd799439011";
type Order = Record<string, unknown>;
let order: Order | null = null;
let stockStatus: "available" | "unavailable" | "unknown" = "available";
let shippingAvailable = true;
let marginAllowed = true;
let creationError: Error | null = null;
let duplicateReservation = false;

class TestObjectId {
  constructor(readonly value: string) {}
  static isValid(value: string) { return /^[a-f\d]{24}$/i.test(value); }
}

class TestFeatureDisabledError extends Error {}

function fixture(): Order {
  return {
    _id: new TestObjectId(id), orderNumber: "AVG-100", paymentStatus: "approved", stockApplied: true, total: 20000, currency: "ARS", fulfillmentStatus: "pending",
    customer: { firstName: "Ada", lastName: "Lovelace", email: "buyer@example.test", phone: "+540000000", address: "Calle 1", province: "Buenos Aires", city: "CABA", postalCode: "1000", countryCode: "AR" },
    items: [{ quantity: 1, _internal: { cjId: "pid-1", cjVariantId: "variant-1", cjSku: "SKU-1", costPrice: 10 } }],
  };
}

const collection = {
  async findOne(filter?: Record<string, unknown>) {
    if (filter?.fulfillmentStatus === "unknown" && order?.fulfillmentStatus !== "unknown") return null;
    return order;
  },
  async updateOne(_filter: Record<string, unknown>, update: { $set: Record<string, unknown> }) {
    if (duplicateReservation && update.$set.fulfillmentStatus === "reserved") return { matchedCount: 0 };
    if (order) Object.assign(order, update.$set);
    return { matchedCount: order ? 1 : 0 };
  },
};

async function main() {
  await mock.module("mongodb", { namedExports: { ObjectId: TestObjectId } });
  await mock.module("@/lib/mongo", { namedExports: { getDb: async () => ({ collection: () => collection }) } });
  await mock.module("@/lib/cj/margin", { namedExports: { validateCjMargin: () => ({ allowed: marginAllowed, revenue: 20000, supplierCost: 100, marginAmount: 19900, marginPercent: 99, currency: "ARS", reasons: marginAllowed ? [] : ["negative_margin"], checkedAt: "2026-01-01T00:00:00.000Z" }) } });
  await mock.module("@/lib/cj/client", { namedExports: {
    CjFeatureDisabledError: TestFeatureDisabledError,
    getCjVariantStock: async (input: { quantity: number }) => ({ status: stockStatus, requestedQuantity: input.quantity, availableQuantity: stockStatus === "available" ? input.quantity : 0, warehouse: "Mock warehouse", checkedAt: "2026-01-01T00:00:00.000Z" }),
    quoteCjShipping: async () => shippingAvailable ? [{ logisticName: "Mock freight", shippingCost: 5, currency: "USD", warehouse: "Mock warehouse" }] : [],
    selectCjShippingOption: (options: Array<{ logisticName: string; shippingCost: number; currency: string }>) => { if (!options[0]) throw new Error("no freight"); return options[0]; },
    createCjOrder: async () => { if (creationError) throw creationError; return { supplierOrderId: "supplier-1", orderId: "platform-1", cjOrderId: "cj-1", status: "created", createdAt: "2026-01-01T00:00:00.000Z" }; },
    getCjOrderDetail: async () => ({ status: "shipped", trackingNumber: "TRACK-1" }),
    getCjTracking: async () => ({ status: "shipped", trackingNumber: "TRACK-1", carrier: "Mock carrier", events: [] }),
    reconcileCjOrder: async () => ({ status: "created", orderId: "platform-1" }),
  } });

  const service = await import("../../lib/cj/fulfillment-service");
  const reset = () => { order = fixture(); stockStatus = "available"; shippingAvailable = true; marginAllowed = true; creationError = null; duplicateReservation = false; };

  reset();
  const validation = await service.validateCjFulfillment(id);
  assert.equal(validation.eligible, true, "orden elegible");
  assert.equal(JSON.stringify(order?.cjStockSnapshot).includes("buyer@example.test"), false, "snapshots sin PII");

  reset(); (order as Order).paymentStatus = "pending"; assert.ok((await service.validateCjFulfillment(id)).reasons.includes("payment_not_approved"));
  reset(); ((order as Order).customer as Order).countryCode = "ARG"; assert.ok((await service.validateCjFulfillment(id)).reasons.includes("invalid_address"));
  reset(); ((((order as Order).items as Order[])[0]._internal as Order).cjVariantId = ""); assert.ok((await service.validateCjFulfillment(id)).reasons.includes("invalid_cj_items"));
  reset(); stockStatus = "unavailable"; assert.ok((await service.validateCjFulfillment(id)).reasons.includes("cj_stock_unavailable"));
  reset(); stockStatus = "unknown"; assert.ok((await service.validateCjFulfillment(id)).reasons.includes("cj_stock_unavailable"));
  reset(); shippingAvailable = false; assert.ok((await service.validateCjFulfillment(id)).reasons.includes("cj_shipping_unavailable"));
  reset(); marginAllowed = false; assert.ok((await service.validateCjFulfillment(id)).reasons.includes("negative_margin"));

  process.env.CJ_ORDER_CREATION_ENABLED = "false";
  await assert.rejects(() => service.executeCjFulfillment(id), TestFeatureDisabledError, "create bloqueado por flag");
  process.env.CJ_ORDER_CREATION_ENABLED = "true";
  reset(); duplicateReservation = true; await assert.rejects(() => service.executeCjFulfillment(id), /reservado/, "reserva duplicada");
  reset(); const created = await service.executeCjFulfillment(id); assert.ok("supplierOrderId" in created); if ("supplierOrderId" in created) assert.equal(created.supplierOrderId, "supplier-1", "create exitoso mockeado");
  reset(); creationError = new Error("timeout"); await assert.rejects(() => service.executeCjFulfillment(id), /timeout/); assert.equal(order?.fulfillmentStatus, "unknown", "timeout pasa a unknown");
  reset(); (order as Order).cjPlatformOrderId = "platform-1"; const synced = await service.syncCjFulfillment(id); assert.equal(synced.tracking.trackingNumber, "TRACK-1", "sync con tracking");
  reset(); (order as Order).fulfillmentStatus = "unknown"; assert.ok(await service.reconcileCjFulfillment(id), "reconcile unknown");
  reset(); await assert.rejects(() => service.reconcileCjFulfillment(id), /reconciliable/, "reconcile fuera de unknown");
  console.log("CJ fulfillment-service mock coverage passed");
}

void main().catch((error: unknown) => { console.error(error); process.exitCode = 1; });

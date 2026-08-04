import { ObjectId, type Document, type Filter, type UpdateFilter } from "mongodb";

export type CjFulfillmentStatus = "ready" | "requesting" | "submitted" | "processing" | "shipped" | "delivered" | "failed" | "unknown";
type CjFulfillmentFailure = "payment_not_approved" | "stock_not_applied" | "invalid_address" | "invalid_cj_items" | "not_found" | "already_submitted" | "fulfillment_in_progress" | "fulfillment_not_ready" | "concurrent_conflict" | "provider_error" | "timeout_uncertain";

export type CjFulfillmentPayload = {
  orderReference: string;
  recipient: { firstName: string; lastName: string; email: string; phone: string; address: string; city: string; province: string; postalCode: string; countryCode: string };
  items: Array<{ cjId: string; quantity: number; cjVariantId: string; cjSku: string }>;
};

export type CjFulfillmentClient = {
  createOrder(payload: CjFulfillmentPayload): Promise<{ supplierOrderId: string }>;
};

export class CjFulfillmentTimeoutError extends Error {
  constructor() { super("CJ fulfillment request timed out"); this.name = "CjFulfillmentTimeoutError"; }
}

export type CjFulfillmentOrderStore = {
  findOne(filter: Filter<Document>): Promise<Document | null>;
  updateOne(filter: Filter<Document>, update: UpdateFilter<Document>): Promise<{ matchedCount: number }>;
};

type Eligibility = { eligible: true; payload: CjFulfillmentPayload } | { eligible: false; reason: CjFulfillmentFailure };
export type CjFulfillmentResult = { success: true; outcome: "submitted" | "already_submitted"; supplierOrderId: string } | { success: false; outcome: CjFulfillmentFailure };
export type CjTrackingResult = { success: true; outcome: "applied" | "idempotent" } | { success: false; outcome: "not_found" | "not_submitted" | "invalid_transition" | "concurrent_conflict" };

function record(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" ? value as Record<string, unknown> : null;
}

function nonEmptyText(value: unknown, max = 500): string | null {
  return typeof value === "string" && value.trim().length > 0 && value.trim().length <= max ? value.trim() : null;
}

function isCjItem(value: unknown): value is { quantity: number; _internal: Record<string, unknown> } {
  const item = record(value);
  const internal = record(item?._internal);
  return Boolean(item && internal && Number.isInteger(item.quantity) && (item.quantity as number) > 0 && (internal.supplierId === "cj" || String(internal.supplier ?? "").toLowerCase() === "cj dropshipping"));
}

export function getCjFulfillmentEligibility(order: unknown): Eligibility {
  const source = record(order);
  if (!source) return { eligible: false, reason: "not_found" };
  if (source.paymentStatus !== "approved") return { eligible: false, reason: "payment_not_approved" };
  if (source.stockApplied !== true) return { eligible: false, reason: "stock_not_applied" };
  const customer = record(source.customer);
  const firstName = nonEmptyText(customer?.firstName, 80); const lastName = nonEmptyText(customer?.lastName, 80); const email = nonEmptyText(customer?.email, 254);
  const phone = nonEmptyText(customer?.phone, 40); const address = nonEmptyText(customer?.address, 200); const city = nonEmptyText(customer?.city, 100);
  const province = nonEmptyText(customer?.province, 100); const postalCode = nonEmptyText(customer?.postalCode, 20);
  const countryCode = typeof customer?.countryCode === "string" ? customer.countryCode.trim().toUpperCase() : "";
  if (!firstName || !lastName || !email || !phone || !address || !city || !province || !postalCode || !/^[A-Z]{2}$/.test(countryCode)) return { eligible: false, reason: "invalid_address" };
  if (!Array.isArray(source.items) || source.items.length === 0 || !source.items.every(isCjItem)) return { eligible: false, reason: "invalid_cj_items" };
  const items: CjFulfillmentPayload["items"] = [];
  for (const item of source.items) {
    const internal = item._internal;
    const cjId = nonEmptyText(internal.cjId, 160);
    const cjVariantId = nonEmptyText(internal.cjVariantId, 160);
    const cjSku = nonEmptyText(internal.cjSku, 160);
    if (!cjId || !cjVariantId || !cjSku) return { eligible: false, reason: "invalid_cj_items" };
    items.push({ cjId, quantity: item.quantity, cjVariantId, cjSku });
  }
  const id = source._id instanceof ObjectId ? source._id.toHexString() : nonEmptyText(source._id, 100);
  if (!id) return { eligible: false, reason: "not_found" };
  return { eligible: true, payload: { orderReference: id, recipient: { firstName, lastName, email, phone, address, city, province, postalCode, countryCode }, items } };
}

function getOrderId(orderId: string): ObjectId | null {
  return ObjectId.isValid(orderId) ? new ObjectId(orderId) : null;
}

export async function submitCjFulfillment(orderId: string, store: CjFulfillmentOrderStore, client: CjFulfillmentClient, now = new Date()): Promise<CjFulfillmentResult> {
  const id = getOrderId(orderId);
  if (!id) return { success: false, outcome: "not_found" };
  const order = await store.findOne({ _id: id });
  if (order && typeof order.supplierOrderId === "string" && order.supplierOrderId) {
    return { success: true, outcome: "already_submitted", supplierOrderId: order.supplierOrderId };
  }
  const eligibility = getCjFulfillmentEligibility(order);
  if (!eligibility.eligible) return { success: false, outcome: eligibility.reason };
  const reserved = await store.updateOne(
    { _id: id, paymentStatus: "approved", stockApplied: true, supplierOrderId: { $exists: false }, fulfillmentProcessing: { $ne: true }, $or: [{ fulfillmentStatus: { $exists: false } }, { fulfillmentStatus: "ready" }] },
    { $set: { fulfillmentStatus: "requesting", fulfillmentProcessing: true, fulfillmentRequestedAt: now, updatedAt: now } },
  );
  if (!reserved.matchedCount) {
    const latest = await store.findOne({ _id: id });
    if (!latest) return { success: false, outcome: "not_found" };
    if (typeof latest.supplierOrderId === "string" && latest.supplierOrderId) return { success: true, outcome: "already_submitted", supplierOrderId: latest.supplierOrderId };
    if (latest.fulfillmentStatus === "requesting" || latest.fulfillmentStatus === "unknown") return { success: false, outcome: "fulfillment_in_progress" };
    return { success: false, outcome: "concurrent_conflict" };
  }
  try {
    const result = await client.createOrder(eligibility.payload);
    const supplierOrderId = nonEmptyText(result.supplierOrderId, 160);
    if (!supplierOrderId) throw new Error("Invalid simulated supplier order id");
    await store.updateOne({ _id: id, fulfillmentProcessing: true }, { $set: { supplierOrderId, fulfillmentStatus: "submitted", fulfillmentProcessing: false, updatedAt: now }, $unset: { fulfillmentError: "" } });
    return { success: true, outcome: "submitted", supplierOrderId };
  } catch (error) {
    const outcome = error instanceof CjFulfillmentTimeoutError ? "timeout_uncertain" : "provider_error";
    await store.updateOne({ _id: id, fulfillmentProcessing: true }, { $set: { fulfillmentStatus: outcome === "timeout_uncertain" ? "unknown" : "failed", fulfillmentProcessing: false, fulfillmentError: outcome, updatedAt: now } });
    return { success: false, outcome };
  }
}

const trackingRank: Record<"submitted" | "processing" | "shipped" | "delivered", number> = { submitted: 0, processing: 1, shipped: 2, delivered: 3 };

export function isMonotonicCjTrackingTransition(current: unknown, next: "processing" | "shipped" | "delivered") {
  return (current === "submitted" || current === "processing" || current === "shipped" || current === "delivered") && trackingRank[next] >= trackingRank[current];
}

export async function recordCjTracking(orderId: string, store: CjFulfillmentOrderStore, tracking: { status: "processing" | "shipped" | "delivered"; carrier: string; trackingNumber: string; trackingUrl?: string }, now = new Date()): Promise<CjTrackingResult> {
  const id = getOrderId(orderId);
  if (!id) return { success: false, outcome: "not_found" };
  const order = await store.findOne({ _id: id });
  if (!order) return { success: false, outcome: "not_found" };
  if (typeof order.supplierOrderId !== "string" || !order.supplierOrderId) return { success: false, outcome: "not_submitted" };
  if (!isMonotonicCjTrackingTransition(order.fulfillmentStatus, tracking.status)) return { success: false, outcome: "invalid_transition" };
  const carrier = nonEmptyText(tracking.carrier, 160); const trackingNumber = nonEmptyText(tracking.trackingNumber, 160); const trackingUrl = tracking.trackingUrl === undefined ? undefined : nonEmptyText(tracking.trackingUrl, 2_000);
  if (!carrier || !trackingNumber || trackingUrl === null) return { success: false, outcome: "invalid_transition" };
  if (order.fulfillmentStatus === tracking.status && order.tracking === trackingNumber && order.carrier === carrier && (trackingUrl === undefined || order.trackingUrl === trackingUrl)) return { success: true, outcome: "idempotent" };
  const update = await store.updateOne({ _id: id, supplierOrderId: order.supplierOrderId, fulfillmentStatus: order.fulfillmentStatus }, { $set: { fulfillmentStatus: tracking.status, carrier, tracking: trackingNumber, ...(trackingUrl ? { trackingUrl } : {}), ...(tracking.status === "delivered" ? { fulfilledAt: now } : {}), lastTrackingSyncAt: now, updatedAt: now } });
  return update.matchedCount ? { success: true, outcome: "applied" } : { success: false, outcome: "concurrent_conflict" };
}

/** Fixture-only client. It makes no HTTP request and must not be used to call CJ. */
export function createSimulatedCjFulfillmentClient(): CjFulfillmentClient {
  return { async createOrder(payload) { return { supplierOrderId: `cj-sim-${payload.orderReference}` }; } };
}

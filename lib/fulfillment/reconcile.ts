import type { Collection, Document } from "mongodb";
import { notifyOperationalAlert } from "@/lib/alerts";
import { dropsheableProvider } from "./dropsheable";
import type { FulfillmentProvider } from "./provider";

export type ReconciliationIncident = {
  code: string;
  message: string;
  retryable: boolean;
};

const STALE_PENDING_MS = 30 * 60 * 1000;
const STALE_SUBMITTED_MS = 60 * 60 * 1000;

export function inspectFulfillmentOrder(order: Document, now = Date.now()): ReconciliationIncident[] {
  const incidents: ReconciliationIncident[] = [];
  const paymentStatus = String(order.paymentStatus ?? "");
  const fulfillmentStatus = String(order.fulfillmentStatus ?? "pending");
  const queuedAt = order.fulfillmentQueuedAt instanceof Date ? order.fulfillmentQueuedAt.getTime() : 0;
  const submittedAt = order.fulfillmentSubmittedAt instanceof Date ? order.fulfillmentSubmittedAt.getTime() : 0;

  if (paymentStatus === "approved" && fulfillmentStatus === "pending" && queuedAt > 0 && now - queuedAt > STALE_PENDING_MS) incidents.push({ code: "PAYMENT_WITHOUT_FULFILLMENT", message: "Pago aprobado con fulfillment pendiente fuera de SLA", retryable: true });
  if (["submitted", "confirmed", "preparing"].includes(fulfillmentStatus) && !order.externalOrderId) incidents.push({ code: "SUBMITTED_WITHOUT_EXTERNAL_ID", message: "Fulfillment marcado como enviado sin ID externo", retryable: false });
  if (["submitted", "confirmed", "preparing", "shipped", "in_transit"].includes(fulfillmentStatus) && !order.trackingNumber && !order.tracking) incidents.push({ code: "AWAITING_TRACKING", message: "Pedido sin tracking confirmado por el proveedor", retryable: true });
  if ((order.trackingNumber || order.tracking) && !["shipped", "in_transit", "delivered"].includes(fulfillmentStatus)) incidents.push({ code: "TRACKING_STATE_MISMATCH", message: "Existe tracking con estado local incompatible", retryable: false });
  if (["refunded", "partially_refunded", "charged_back", "cancelled", "rejected"].includes(paymentStatus) && ["pending", "processing", "submitted", "confirmed", "preparing"].includes(fulfillmentStatus)) incidents.push({ code: "TERMINAL_PAYMENT_PENDING_FULFILLMENT", message: "Pago terminal con fulfillment todavía activo", retryable: false });
  if (order.stockIssue === true || order.stockIssueReason) incidents.push({ code: "STOCK_INSUFFICIENT", message: "La orden tiene una incidencia de stock", retryable: true });
  if (Number(order.fulfillmentAttempts ?? 0) >= 3 && order.lastFulfillmentError) incidents.push({ code: "PROVIDER_RETRIES_EXHAUSTED", message: "El proveedor acumula errores de fulfillment", retryable: true });
  if (["submitted", "confirmed", "preparing"].includes(fulfillmentStatus) && submittedAt > 0 && now - submittedAt > STALE_SUBMITTED_MS) incidents.push({ code: "FULFILLMENT_CONFIRMATION_STALE", message: "Fulfillment enviado sin confirmación dentro del SLA", retryable: true });
  return incidents;
}

export async function reconcileFulfillmentOrders(orders: Collection<Document>, limit = 100, provider: FulfillmentProvider = dropsheableProvider) {
  const candidates = await orders.find({ paymentStatus: { $exists: true }, fulfillmentStatus: { $exists: true } }).sort({ updatedAt: 1 }).limit(limit).toArray();
  let inspected = 0;
  let incidents = 0;
  let recorded = 0;
  const now = new Date();

  for (const order of candidates) {
    if (!order._id) continue;
    inspected += 1;
    if (typeof order.externalOrderId === "string" && order.externalOrderId && ["submitted", "confirmed", "preparing", "shipped", "in_transit"].includes(String(order.fulfillmentStatus))) {
      const status = await provider.getOrderStatus(order.externalOrderId);
      if (status.success) {
        const update: Record<string, unknown> = { lastTrackingSyncAt: now, updatedAt: now };
        if (status.status) update.fulfillmentStatus = status.status;
        if (status.trackingNumber) { update.trackingNumber = status.trackingNumber; update.tracking = status.trackingNumber; }
        if (status.trackingUrl) update.trackingUrl = status.trackingUrl;
        if (status.carrier) update.carrier = status.carrier;
        await orders.updateOne({ _id: order._id }, { $set: update });
      }
    }
    if (["submitted", "confirmed", "preparing", "shipped", "in_transit"].includes(String(order.fulfillmentStatus)) && !order.trackingNumber && !order.tracking && order.shippingStatus !== "awaiting_tracking") {
      await orders.updateOne({ _id: order._id }, { $set: { shippingStatus: "awaiting_tracking", lastTrackingSyncAt: now, updatedAt: now } });
    }
    const found = inspectFulfillmentOrder(order, now.getTime());
    for (const incident of found) {
      incidents += 1;
      const key = `reconcile:${incident.code}:${now.toISOString().slice(0, 13)}`;
      const update = await orders.updateOne({ _id: order._id, "operationalEvents.key": { $ne: key } }, { $push: { operationalEvents: { key, type: `reconciliation.${incident.code.toLowerCase()}`, timestamp: now, source: "reconciliation", result: incident.message } }, $set: { reconciliationStatus: "incident", lastReconciledAt: now, updatedAt: now } } as never);
      if (update.modifiedCount) recorded += 1;
      notifyOperationalAlert(`reconciliation_${incident.code.toLowerCase()}`, { orderId: String(order._id) });
    }
    if (found.length === 0) await orders.updateOne({ _id: order._id }, { $set: { reconciliationStatus: "ok", lastReconciledAt: now } });
  }
  return { inspected, incidents, recorded };
}

import { ObjectId, type Document } from "mongodb";
import { CjFeatureDisabledError, createCjOrder, getCjOrderDetail, getCjTracking, getCjVariantStock, quoteCjShipping, reconcileCjOrder, selectCjShippingOption } from "@/lib/cj/client";
import { validateCjMargin, type CjMarginResult } from "@/lib/cj/margin";
import { getDb } from "@/lib/mongo";

type CjItem = { pid: string; variantId: string; sku: string; quantity: number; productCost: number };
export type CjFulfillmentValidation = { eligible: boolean; orderId: string; reasons: string[]; stock: Awaited<ReturnType<typeof getCjVariantStock>>[]; shipping?: Awaited<ReturnType<typeof selectCjShippingOption>>; margin?: CjMarginResult; checkedAt: string };

function readItems(order: Document): CjItem[] | null {
  if (!Array.isArray(order.items)) return null;
  const items: CjItem[] = [];
  for (const source of order.items) {
    const item = source && typeof source === "object" ? source as Record<string, unknown> : null;
    const internal = item?._internal && typeof item._internal === "object" ? item._internal as Record<string, unknown> : null;
    const pid = typeof internal?.cjId === "string" ? internal.cjId : ""; const variantId = typeof internal?.cjVariantId === "string" ? internal.cjVariantId : ""; const sku = typeof internal?.cjSku === "string" ? internal.cjSku : "";
    const quantity = typeof item?.quantity === "number" ? item.quantity : NaN; const productCost = typeof internal?.costPrice === "number" ? internal.costPrice : NaN;
    if (!pid || !variantId || !sku || !Number.isInteger(quantity) || quantity < 1 || !Number.isFinite(productCost) || productCost < 0) return null;
    items.push({ pid, variantId, sku, quantity, productCost });
  }
  return items;
}

function address(order: Document) {
  const customer = order.customer && typeof order.customer === "object" ? order.customer as Record<string, unknown> : null;
  const names = ["firstName", "lastName", "email", "phone", "address", "province", "city", "postalCode"] as const;
  if (!customer || names.some((key) => typeof customer[key] !== "string" || !customer[key].trim())) return null;
  const countryCode = typeof customer.countryCode === "string" ? customer.countryCode.trim().toUpperCase() : "";
  if (!/^[A-Z]{2}$/.test(countryCode)) return null;
  return { firstName: customer.firstName as string, lastName: customer.lastName as string, email: customer.email as string, phone: customer.phone as string, address: customer.address as string, province: customer.province as string, city: customer.city as string, postalCode: customer.postalCode as string, countryCode };
}

export async function validateCjFulfillment(orderId: string): Promise<CjFulfillmentValidation> {
  if (!ObjectId.isValid(orderId)) return { eligible: false, orderId, reasons: ["order_not_found"], stock: [], checkedAt: new Date().toISOString() };
  const db = await getDb(); const order = await db.collection("orders").findOne({ _id: new ObjectId(orderId) }); const checkedAt = new Date().toISOString();
  if (!order) return { eligible: false, orderId, reasons: ["order_not_found"], stock: [], checkedAt };
  const recipient = address(order); const items = readItems(order); const reasons: string[] = [];
  if (order.paymentStatus !== "approved") reasons.push("payment_not_approved"); if (order.stockApplied !== true) reasons.push("stock_not_applied"); if (!recipient) reasons.push("invalid_address"); if (!items) reasons.push("invalid_cj_items");
  const stock = items ? await Promise.all(items.map((item) => getCjVariantStock(item))) : [];
  if (stock.some((item) => item.status !== "available")) reasons.push("cj_stock_unavailable");
  let shipping: CjFulfillmentValidation["shipping"]; let margin: CjMarginResult | undefined;
  if (recipient && items && reasons.length === 0) { const options = await quoteCjShipping({ variantId: items[0].variantId, quantity: items[0].quantity, countryCode: recipient.countryCode, province: recipient.province, city: recipient.city, postalCode: recipient.postalCode }); try { shipping = selectCjShippingOption(options); } catch { reasons.push("cj_shipping_unavailable"); } if (shipping) { margin = validateCjMargin({ revenue: typeof order.total === "number" ? order.total : 0, revenueCurrency: typeof order.currency === "string" ? order.currency : "ARS", productCost: items.reduce((sum, item) => sum + item.productCost * item.quantity, 0), shippingCost: shipping.shippingCost, costCurrency: shipping.currency }); if (!margin.allowed) reasons.push(...margin.reasons); } }
  const result = { eligible: reasons.length === 0, orderId, reasons, stock, ...(shipping ? { shipping } : {}), ...(margin ? { margin } : {}), checkedAt };
  await db.collection("orders").updateOne({ _id: order._id }, { $set: { cjValidationStatus: result.eligible ? "eligible" : "ineligible", cjValidatedAt: new Date(checkedAt), cjValidationReasons: reasons, cjStockSnapshot: stock.map(({ status, requestedQuantity, availableQuantity, warehouse, checkedAt: at }) => ({ status, requestedQuantity, availableQuantity, warehouse, checkedAt: at })), ...(shipping ? { cjShippingSnapshot: shipping } : {}), ...(margin ? { cjMarginSnapshot: margin } : {}), updatedAt: new Date() } });
  return result;
}

export async function executeCjFulfillment(orderId: string) {
  if (process.env.CJ_ORDER_CREATION_ENABLED !== "true") throw new CjFeatureDisabledError();
  const validation = await validateCjFulfillment(orderId); if (!validation.eligible || !validation.shipping) return validation;
  const db = await getDb(); const id = new ObjectId(orderId); const reservation = await db.collection("orders").updateOne({ _id: id, fulfillmentStatus: { $in: ["validated", "ready", "pending"] }, supplierOrderId: { $exists: false } }, { $set: { fulfillmentStatus: "reserved", fulfillmentReservedAt: new Date(), fulfillmentAttemptId: crypto.randomUUID(), fulfillmentIdempotencyKey: crypto.randomUUID(), updatedAt: new Date() } });
  if (!reservation.matchedCount) throw new Error("Fulfillment CJ ya reservado o creado");
  const order = await db.collection("orders").findOne({ _id: id }); const recipient = order && address(order); const items = order && readItems(order); if (!order || !recipient || !items) throw new Error("Orden CJ inválida después de reserva");
  try { await db.collection("orders").updateOne({ _id: id, fulfillmentStatus: "reserved" }, { $set: { fulfillmentStatus: "creating" } }); const created = await createCjOrder({ orderNumber: String(order.orderNumber), recipient, logisticName: validation.shipping.logisticName, items: items.map((item) => ({ variantId: item.variantId, sku: item.sku, quantity: item.quantity })) }); await db.collection("orders").updateOne({ _id: id }, { $set: { fulfillmentStatus: "created", supplierOrderId: created.supplierOrderId, cjPlatformOrderId: created.orderId, cjOrderNumber: created.orderNum, cjOrderId: created.cjOrderId, cjShipmentOrderId: created.shipmentOrderId, supplierRawStatus: created.status, fulfillmentCreatedAt: new Date(), updatedAt: new Date() } }); return created; }
  catch (error) { await db.collection("orders").updateOne({ _id: id }, { $set: { fulfillmentStatus: "unknown", cjLastError: error instanceof Error ? error.name : "unknown", cjLastSyncAt: new Date(), updatedAt: new Date() } }); throw error; }
}

export async function syncCjFulfillment(orderId: string) { const db = await getDb(); if (!ObjectId.isValid(orderId)) throw new Error("Orden inválida"); const order = await db.collection("orders").findOne({ _id: new ObjectId(orderId) }); const identifier = typeof order?.cjPlatformOrderId === "string" ? order.cjPlatformOrderId : typeof order?.supplierOrderId === "string" ? order.supplierOrderId : ""; if (!identifier) throw new Error("Orden CJ sin identificador"); const detail = await getCjOrderDetail({ orderId: identifier }); const tracking = detail.trackingNumber ? await getCjTracking({ trackingNumber: detail.trackingNumber }) : { status: "pending" as const, events: [] }; await db.collection("orders").updateOne({ _id: order!._id }, { $set: { supplierRawStatus: detail.status, fulfillmentStatus: tracking.status === "delivered" ? "delivered" : tracking.status === "shipped" || tracking.status === "in_transit" ? "shipped" : "processing", trackingNumber: tracking.trackingNumber, trackingStatus: tracking.status, trackingCarrier: tracking.carrier, cjLastSyncAt: new Date(), updatedAt: new Date() } }); return { detail, tracking }; }
export async function reconcileCjFulfillment(orderId: string) { const db = await getDb(); const order = ObjectId.isValid(orderId) ? await db.collection("orders").findOne({ _id: new ObjectId(orderId), fulfillmentStatus: "unknown" }) : null; if (!order) throw new Error("Orden no reconciliable"); const detail = await reconcileCjOrder({ orderId: typeof order.cjPlatformOrderId === "string" ? order.cjPlatformOrderId : undefined, shipmentOrderId: typeof order.cjShipmentOrderId === "string" ? order.cjShipmentOrderId : undefined }); await db.collection("orders").updateOne({ _id: order._id }, { $set: { fulfillmentStatus: detail ? "created" : "unknown", cjReconciliationAttempts: Number(order.cjReconciliationAttempts ?? 0) + 1, cjLastReconciliationAt: new Date(), cjReconciliationResult: detail ? "found" : "not_found" } }); return detail; }

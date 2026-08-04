import { ObjectId } from "mongodb";
import clientPromise, { getDb } from "@/lib/mongo";
import type { VerifiedMercadoPagoPayment } from "@/lib/mercadopago";
import { canTransitionMercadoPagoPaymentStatus, getMercadoPagoOrderStatus, normalizeMercadoPagoPaymentStatus, type MercadoPagoPaymentStatus } from "@/lib/mercadopago-payment-status";

export type PaymentProcessingResult = { success: true; duplicate: boolean; orderId: string } | { success: false; reason: "missing_reference" | "order_not_found" | "amount_mismatch" | "currency_mismatch" | "payment_conflict" | "invalid_transition" | "database_error" };
export type ApplyPaidOrderStockResult = { success: true; outcome: "applied" | "already_applied"; orderId: string } | { success: false; outcome: "order_not_found" | "payment_not_approved" | "invalid_items" | "product_not_found" | "insufficient_stock" | "processing_conflict" | "database_error"; orderId?: string };
class StockIssueError extends Error { constructor(public readonly outcome: "invalid_items" | "product_not_found" | "insufficient_stock") { super(outcome); } }

function money(value: unknown) { return typeof value === "number" && Number.isFinite(value) && value >= 0 ? Math.round(value * 100) : null; }
export async function processVerifiedMercadoPagoPayment(payment: VerifiedMercadoPagoPayment): Promise<PaymentProcessingResult> {
  if (!payment.externalReference || !ObjectId.isValid(payment.externalReference)) return { success: false, reason: "missing_reference" };
  try {
    const db = await getDb();
    const orderId = new ObjectId(payment.externalReference);
    const order = await db.collection("orders").findOne({ _id: orderId });
    if (!order) return { success: false, reason: "order_not_found" };
    if (money(order.total) !== money(payment.transactionAmount)) return { success: false, reason: "amount_mismatch" };
    const currency = String(order.currency ?? process.env.MERCADOPAGO_CURRENCY ?? "ARS").trim().toUpperCase();
    if (!payment.currencyId || payment.currencyId.toUpperCase() !== currency) return { success: false, reason: "currency_mismatch" };
    const otherOrder = await db.collection("orders").findOne({ paymentId: payment.id, _id: { $ne: orderId } });
    if (otherOrder) return { success: false, reason: "payment_conflict" };
    const paymentStatus = normalizeMercadoPagoPaymentStatus(payment.status);
    if (!canTransitionMercadoPagoPaymentStatus(typeof order.paymentStatus === "string" ? order.paymentStatus : undefined, paymentStatus)) return { success: true, duplicate: true, orderId: String(orderId) };
    const existingPaymentId = typeof order.paymentId === "string" ? order.paymentId : null;
    const terminalStatus: MercadoPagoPaymentStatus[] = ["partially_refunded", "refunded", "charged_back"];
    if (existingPaymentId && existingPaymentId !== payment.id && terminalStatus.includes(paymentStatus)) return { success: false, reason: "invalid_transition" };
    const currentPaymentStatus = typeof order.paymentStatus === "string" ? order.paymentStatus : "pending";
    const update = await db.collection("orders").updateOne({ _id: orderId, paymentStatus: currentPaymentStatus, ...(existingPaymentId ? { paymentId: existingPaymentId } : {}) }, { $set: { paymentId: payment.id, paymentStatus, status: getMercadoPagoOrderStatus(paymentStatus), paymentProcessedAt: new Date(), paymentStatusDetail: payment.statusDetail, updatedAt: new Date() } });
    return update.matchedCount ? { success: true, duplicate: false, orderId: String(orderId) } : { success: true, duplicate: true, orderId: String(orderId) };
  } catch { return { success: false, reason: "database_error" }; }
}

export async function applyPaidOrderStock(orderId: string): Promise<ApplyPaidOrderStockResult> {
  if (!ObjectId.isValid(orderId)) return { success: false, outcome: "order_not_found" };
  const id = new ObjectId(orderId);
  const db = await getDb();
  const lock = await db.collection("orders").updateOne({ _id: id, paymentStatus: "approved", stockApplied: { $ne: true }, stockProcessing: { $ne: true } }, { $set: { stockProcessing: true, stockProcessingAt: new Date() } });
  if (!lock.matchedCount) {
    const order = await db.collection("orders").findOne({ _id: id });
    if (!order) return { success: false, outcome: "order_not_found" };
    if (order.stockApplied === true) return { success: true, outcome: "already_applied", orderId };
    return { success: false, outcome: order.paymentStatus === "approved" ? "processing_conflict" : "payment_not_approved", orderId };
  }
  const client = await clientPromise;
  const session = client.startSession();
  try {
    await session.withTransaction(async () => {
      const order = await db.collection("orders").findOne({ _id: id, paymentStatus: "approved", stockApplied: { $ne: true } }, { session });
      if (!order || !Array.isArray(order.items)) throw new StockIssueError("invalid_items");
      const quantities = new Map<string, number>();
      for (const item of order.items) {
        const record = item as Record<string, unknown>;
        const productId = typeof record._id === "string" ? record._id : "";
        const quantity = typeof record.quantity === "number" ? record.quantity : NaN;
        if (!ObjectId.isValid(productId) || !Number.isInteger(quantity) || quantity < 1 || quantity > 20) throw new StockIssueError("invalid_items");
        quantities.set(productId, (quantities.get(productId) ?? 0) + quantity);
      }
      for (const [productId, quantity] of quantities) {
        const update = await db.collection("products").updateOne({ _id: new ObjectId(productId), stockQuantity: { $gte: quantity } }, { $inc: { stockQuantity: -quantity } }, { session });
        if (!update.matchedCount) throw new StockIssueError("insufficient_stock");
      }
      await db.collection("orders").updateOne({ _id: id }, { $set: { stockApplied: true, stockAppliedAt: new Date(), stockProcessing: false, stockIssue: false, status: "paid", updatedAt: new Date() }, $unset: { stockIssueReason: "" } }, { session });
    });
    return { success: true, outcome: "applied", orderId };
  } catch (error) {
    if (error instanceof StockIssueError) {
      await db.collection("orders").updateOne({ _id: id }, { $set: { stockApplied: false, stockProcessing: false, stockIssue: true, stockIssueReason: error.outcome.toUpperCase(), status: "stock_issue", updatedAt: new Date() } });
      return { success: false, outcome: error.outcome, orderId };
    }
    await db.collection("orders").updateOne({ _id: id, stockApplied: { $ne: true } }, { $set: { stockProcessing: false, updatedAt: new Date() } });
    return { success: false, outcome: "database_error", orderId };
  } finally { await session.endSession(); }
}

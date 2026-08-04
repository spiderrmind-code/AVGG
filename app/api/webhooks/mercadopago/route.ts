import { NextResponse } from "next/server";
import { extractMercadoPagoPaymentId, getMercadoPagoPayment, MercadoPagoProviderError } from "@/lib/mercadopago";
import { applyPaidOrderStock, processVerifiedMercadoPagoPayment } from "@/lib/mercadopago-orders";
import { canAllowUnsignedMercadoPagoWebhook, verifyMercadoPagoWebhookSignature } from "@/lib/mercadopago-webhook-signature";
import { logServerError, logServerEvent } from "@/lib/logger";

function isIrrelevantNotification(body: unknown): boolean {
  if (!body || typeof body !== "object") return false;
  const event = body as Record<string, unknown>;
  const type = typeof event.type === "string" ? event.type.toLowerCase() : "";
  const action = typeof event.action === "string" ? event.action.toLowerCase() : "";
  return Boolean(type && type !== "payment" && !action.startsWith("payment."));
}

export async function POST(request: Request) {
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ success: false, message: "Notificación inválida" }, { status: 400 }); }
  if (isIrrelevantNotification(body)) return NextResponse.json({ success: true, processed: false });
  const paymentId = extractMercadoPagoPaymentId(body, request.url);
  if (!paymentId) return NextResponse.json({ success: false, message: "Notificación sin identificador de pago válido" }, { status: 400 });
  const paymentIdSuffix = paymentId.slice(-6);
  logServerEvent("payment.webhook.received", { paymentIdSuffix });
  const signatureCheck = verifyMercadoPagoWebhookSignature({
    paymentId,
    signature: request.headers.get("x-signature"),
    requestId: request.headers.get("x-request-id"),
    secret: process.env.MERCADOPAGO_WEBHOOK_SECRET,
  });
  if (!signatureCheck.valid && !canAllowUnsignedMercadoPagoWebhook()) {
    if (signatureCheck.reason === "missing_secret") {
      return NextResponse.json({ success: false, message: "Webhook de Mercado Pago no configurado" }, { status: 503 });
    }
    return NextResponse.json({ success: false, message: "Firma de webhook inválida" }, { status: 401 });
  }
  try {
    const payment = await getMercadoPagoPayment(paymentId);
    const result = await processVerifiedMercadoPagoPayment(payment);
    if (result.success) {
      if (payment.status.toLowerCase() !== "approved") {
        logServerEvent(`payment.${payment.status.toLowerCase()}`, { orderId: result.orderId, paymentIdSuffix });
        return NextResponse.json({ success: true, processed: !result.duplicate, ...(payment.status.toLowerCase() === "pending" || payment.status.toLowerCase() === "in_process" ? { paymentPending: true } : { paymentApproved: false }) });
      }
      const stock = await applyPaidOrderStock(result.orderId);
      if (stock.success) { logServerEvent(stock.outcome === "applied" ? "stock.deducted" : "stock.skipped_already_processed", { orderId: result.orderId, paymentIdSuffix }); return NextResponse.json({ success: true, processed: stock.outcome === "applied", stockApplied: true, ...(stock.outcome === "already_applied" ? { duplicate: true } : {}) }); }
      if (stock.outcome === "database_error") return NextResponse.json({ success: false, message: "El inventario no pudo procesarse temporalmente" }, { status: 503 });
      if (stock.outcome === "processing_conflict") return NextResponse.json({ success: true, processed: false, duplicate: true, stockApplied: false });
      if (stock.outcome === "invalid_items" || stock.outcome === "product_not_found" || stock.outcome === "insufficient_stock") return NextResponse.json({ success: true, processed: true, stockApplied: false, stockIssue: true });
      return NextResponse.json({ success: false, message: "No se pudo procesar el inventario" }, { status: 503 });
    }
    const statuses = { missing_reference: 422, order_not_found: 404, amount_mismatch: 422, currency_mismatch: 422, payment_conflict: 409, invalid_transition: 409, database_error: 503 } as const;
    logServerError("payment.mismatch", { reason: result.reason, paymentIdSuffix });
    return NextResponse.json({ success: false, message: "Pago no válido para la orden" }, { status: statuses[result.reason] });
  } catch (error) {
    if (error instanceof MercadoPagoProviderError) {
      if (error.statusCode === 404) return NextResponse.json({ success: false, message: "Pago no encontrado" }, { status: 404 });
      return NextResponse.json({ success: false, message: "No se pudo verificar el pago" }, { status: 502 });
    }
    return NextResponse.json({ success: false, message: "Mercado Pago no configurado" }, { status: 503 });
  }
}

import { randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { getDb } from "@/lib/mongo";
import { authorizeOrderAccess, canInitializePayment, resolvePaymentOrigin } from "@/lib/payment";
import { checkRateLimit, requestIdentifier } from "@/lib/request-rate-limit";
import { hasJsonContentType, hasTrustedOrigin } from "@/lib/request-security";
import { isMercadoPagoSandbox, requireMercadoPagoAccessToken, requireMercadoPagoMode, sanitizeMercadoPagoPreferenceError, selectMercadoPagoCheckoutUrl } from "@/lib/mercadopago-config";

interface MercadoPagoRequest { orderId?: unknown; guestAccessToken?: unknown; }
interface PreferenceItem { id: string; title: string; quantity: number; unit_price: number; currency_id: string; picture_url?: string; }
function object(value: unknown): Record<string, unknown> | null { return value && typeof value === "object" ? value as Record<string, unknown> : null; }
function readCustomerEmail(order: Record<string, unknown>): string | undefined { return typeof order.customerEmail === "string" ? order.customerEmail : typeof object(order.customer)?.email === "string" ? object(order.customer)?.email as string : undefined; }

function preferenceItems(value: unknown, currency: string): PreferenceItem[] | null {
  if (!Array.isArray(value) || value.length === 0) return null;
  const items: PreferenceItem[] = [];
  for (const valueItem of value) {
    const item = object(valueItem); if (!item) return null;
    const title = typeof item.name === "string" ? item.name.trim() : "";
    const quantity = typeof item.quantity === "number" ? item.quantity : NaN;
    const unitPrice = typeof item.price === "number" ? item.price : NaN;
    if (!title || !Number.isInteger(quantity) || quantity < 1 || !Number.isFinite(unitPrice) || unitPrice <= 0) return null;
    const id = typeof item._id === "string" ? item._id : "";
    if (!id) return null;
    const preferenceItem: PreferenceItem = { id, title, quantity, unit_price: unitPrice, currency_id: currency };
    if (typeof item.image === "string" && item.image.startsWith("https://")) preferenceItem.picture_url = item.image;
    items.push(preferenceItem);
  }
  return items;
}

export async function POST(request: Request) {
  if (!hasTrustedOrigin(request)) return NextResponse.json({ success: false, message: "Origen no permitido" }, { status: 403 });
  if (!hasJsonContentType(request)) return NextResponse.json({ success: false, message: "Content-Type inválido" }, { status: 415 });
  const limit = checkRateLimit(`payment:${requestIdentifier(request)}`, 10, 10 * 60 * 1000);
  if (!limit.allowed) return NextResponse.json({ success: false, message: "Demasiadas solicitudes" }, { status: 429, headers: { "Retry-After": String(limit.retryAfter) } });
  let orderId = "";
  try {
    const body = await request.json() as MercadoPagoRequest;
    orderId = typeof body.orderId === "string" ? body.orderId : "";
    const guestAccessToken = typeof body.guestAccessToken === "string" ? body.guestAccessToken : undefined;
    let accessToken: string;
    let sandbox: boolean;
    try {
      requireMercadoPagoMode();
      accessToken = requireMercadoPagoAccessToken();
      sandbox = isMercadoPagoSandbox();
    } catch {
      return NextResponse.json({ success: false, message: "Mercado Pago requires an explicit mode and configured credentials" }, { status: 503 });
    }
    if (!ObjectId.isValid(orderId)) return NextResponse.json({ success: false, message: "OrderId inválido" }, { status: 400 });
    const db = await getDb(); const id = new ObjectId(orderId);
    const order = await db.collection("orders").findOne({ _id: id });
    if (!order) return NextResponse.json({ success: false, message: "La orden no existe" }, { status: 404 });
    const email = readCustomerEmail(order); const session = await getServerSession(authOptions);
    if (!(await authorizeOrderAccess({ customerEmail: email, customer: { email }, userId: typeof order.userId === "string" ? order.userId : undefined, guestAccessTokenHash: typeof order.guestAccessTokenHash === "string" ? order.guestAccessTokenHash : undefined }, session ?? undefined, guestAccessToken))) return NextResponse.json({ success: false, message: "No autorizado" }, { status: 401 });
    if (typeof order.preferenceId === "string" && order.preferenceId && typeof order.initPoint === "string" && order.initPoint) return NextResponse.json({ success: true, reused: true, preferenceId: order.preferenceId, initPoint: order.initPoint });
    if (!canInitializePayment({ status: typeof order.status === "string" ? order.status : undefined, paymentStatus: typeof order.paymentStatus === "string" ? order.paymentStatus : undefined })) return NextResponse.json({ success: false, message: "La orden no está pendiente" }, { status: 400 });
    const currency = String(order.currency ?? process.env.MERCADOPAGO_CURRENCY ?? "ARS").trim().toUpperCase();
    const items = preferenceItems(order.items, currency);
    if (!items) return NextResponse.json({ success: false, message: "La orden no tiene items válidos" }, { status: 400 });
    const preferenceRequestKey = typeof order.preferenceRequestKey === "string" && order.preferenceRequestKey ? order.preferenceRequestKey : randomBytes(24).toString("base64url");
    const lock = await db.collection("orders").updateOne({ _id: id, status: "pending", paymentStatus: { $ne: "approved" }, preferenceProcessing: { $ne: true }, $or: [{ preferenceId: null }, { preferenceId: { $exists: false } }, { preferenceId: "" }] }, { $set: { preferenceProcessing: true, preferenceProcessingAt: new Date(), preferenceRequestKey, updatedAt: new Date() } });
    if (!lock.matchedCount) {
      const current = await db.collection("orders").findOne({ _id: id });
      if (typeof current?.preferenceId === "string" && current.preferenceId && typeof current.initPoint === "string" && current.initPoint) return NextResponse.json({ success: true, reused: true, preferenceId: current.preferenceId, initPoint: current.initPoint });
      if (!canInitializePayment({ status: typeof current?.status === "string" ? current.status : undefined, paymentStatus: typeof current?.paymentStatus === "string" ? current.paymentStatus : undefined })) return NextResponse.json({ success: false, message: "La orden no está pendiente" }, { status: 400 });
      return NextResponse.json({ success: false, message: "La preferencia se está inicializando; reintentá en unos segundos" }, { status: 409 });
    }
    const origin = resolvePaymentOrigin();
    const preference = { items, back_urls: { success: `${origin}/checkout/success`, failure: `${origin}/checkout/failure`, pending: `${origin}/checkout/pending` }, auto_return: "approved", external_reference: orderId, notification_url: `${origin}/api/webhooks/mercadopago`, ...(!sandbox && email ? { payer: { email } } : {}), metadata: { order_id: orderId, order_number: typeof order.orderNumber === "string" ? order.orderNumber : undefined }, statement_descriptor: "AVG CONNECTS" };
    const controller = new AbortController(); const timeout = setTimeout(() => controller.abort(), 12_000);
    try {
      const response = await fetch("https://api.mercadopago.com/checkout/preferences", { method: "POST", headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json", "X-Idempotency-Key": preferenceRequestKey }, body: JSON.stringify(preference), signal: controller.signal });
      const data: unknown = await response.json(); const preferenceResponse = object(data);
      if (!response.ok) { const providerError = sanitizeMercadoPagoPreferenceError(preferenceResponse); console.error("Mercado Pago preference creation failed", { providerStatus: response.status, ...providerError, orderId }); return NextResponse.json({ success: false, error: "Mercado Pago rechazó la preferencia", providerStatus: response.status, ...providerError }, { status: [400, 401, 403].includes(response.status) ? response.status : 502 }); }
      const preferenceId = typeof preferenceResponse?.id === "string" ? preferenceResponse.id : null;
      const initPoint = preferenceResponse ? selectMercadoPagoCheckoutUrl(preferenceResponse, sandbox) : null;
      if (!preferenceId || !initPoint) return NextResponse.json({ success: false, message: "Respuesta inválida de Mercado Pago" }, { status: 502 });
      await db.collection("orders").updateOne({ _id: id, preferenceProcessing: true }, { $set: { preferenceId, initPoint, preferenceCreatedAt: new Date(), preferenceProcessing: false, updatedAt: new Date() } });
      return NextResponse.json({ success: true, reused: false, preferenceId, initPoint });
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") return NextResponse.json({ success: false, message: "Mercado Pago tardó demasiado en responder" }, { status: 504 });
      throw error;
    } finally {
      clearTimeout(timeout);
      await db.collection("orders").updateOne({ _id: id, preferenceProcessing: true }, { $set: { preferenceProcessing: false, updatedAt: new Date() } });
    }
  } catch (error) {
    console.error("Mercado Pago preference initialization failed", { errorType: error instanceof Error ? error.name : "unknown", orderId });
    return NextResponse.json({ success: false, message: "Error interno procesando pago" }, { status: 500 });
  }
}

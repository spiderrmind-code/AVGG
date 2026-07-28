import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { getDb } from "@/lib/mongo";
import { authorizeOrderAccess, canInitializePayment, resolvePaymentOrigin } from "@/lib/payment";
import { checkRateLimit, requestIdentifier } from "@/lib/request-rate-limit";
import { hasJsonContentType, hasTrustedOrigin } from "@/lib/request-security";

interface MercadoPagoRequest { orderId?: unknown; guestAccessToken?: unknown; }
interface PreferenceItem { title: string; quantity: number; unit_price: number; currency_id: string; picture_url?: string; }

function object(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? value as Record<string, unknown> : null;
}

function readCustomerEmail(order: Record<string, unknown>): string | undefined {
  if (typeof order.customerEmail === "string") return order.customerEmail;
  const customer = object(order.customer);
  return typeof customer?.email === "string" ? customer.email : undefined;
}

function preferenceItems(value: unknown, currency: string): PreferenceItem[] | null {
  if (!Array.isArray(value) || value.length === 0) return null;
  const items: PreferenceItem[] = [];
  for (const valueItem of value) {
    const item = object(valueItem);
    if (!item) return null;
    const title = typeof item?.name === "string" ? item.name.trim() : "";
    const quantity = typeof item?.quantity === "number" ? item.quantity : NaN;
    const unitPrice = typeof item?.price === "number" ? item.price : NaN;
    if (!title || !Number.isInteger(quantity) || quantity < 1 || !Number.isFinite(unitPrice) || unitPrice <= 0) return null;
    const preferenceItem: PreferenceItem = { title, quantity, unit_price: unitPrice, currency_id: currency };
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
  try {
    const body = await request.json() as MercadoPagoRequest;
    const orderId = typeof body.orderId === "string" ? body.orderId : "";
    const guestAccessToken = typeof body.guestAccessToken === "string" ? body.guestAccessToken : undefined;
    const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
    if (!accessToken) return NextResponse.json({ success: false, message: "Mercado Pago no configurado" }, { status: 503 });
    if (!ObjectId.isValid(orderId)) return NextResponse.json({ success: false, message: "OrderId inválido" }, { status: 400 });

    const db = await getDb();
    const order = await db.collection("orders").findOne({ _id: new ObjectId(orderId) });
    if (!order) return NextResponse.json({ success: false, message: "La orden no existe" }, { status: 404 });
    const email = readCustomerEmail(order);
    const session = await getServerSession(authOptions);
    if (!(await authorizeOrderAccess({ customerEmail: email, customer: { email }, userId: typeof order.userId === "string" ? order.userId : undefined, guestAccessTokenHash: typeof order.guestAccessTokenHash === "string" ? order.guestAccessTokenHash : undefined }, session ?? undefined, guestAccessToken))) {
      return NextResponse.json({ success: false, message: "No autorizado" }, { status: 401 });
    }
    if (!canInitializePayment({ status: typeof order.status === "string" ? order.status : undefined, paymentStatus: typeof order.paymentStatus === "string" ? order.paymentStatus : undefined })) {
      return NextResponse.json({ success: false, message: "La orden no está pendiente" }, { status: 400 });
    }

    const currency = String(order.currency ?? process.env.MERCADOPAGO_CURRENCY ?? "ARS").toUpperCase();
    const items = preferenceItems(order.items, currency);
    if (!items) return NextResponse.json({ success: false, message: "La orden no tiene items válidos" }, { status: 400 });
    const origin = resolvePaymentOrigin();
    const preference = {
      items,
      back_urls: { success: `${origin}/checkout/success`, failure: `${origin}/checkout/failure`, pending: `${origin}/checkout/pending` },
      auto_return: "approved",
      external_reference: orderId,
      notification_url: `${origin}/api/webhooks/mercadopago`,
    };
    const response = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify(preference),
    });
    const data: unknown = await response.json();
    const preferenceResponse = object(data);
    if (!response.ok) {
      console.error("Mercado Pago preference creation failed", { status: response.status, orderId });
      return NextResponse.json({ success: false, message: "Error creando pago" }, { status: 502 });
    }
    const preferenceId = typeof preferenceResponse?.id === "string" ? preferenceResponse.id : null;
    const initPoint = typeof preferenceResponse?.init_point === "string" ? preferenceResponse.init_point : null;
    if (!preferenceId || !initPoint) return NextResponse.json({ success: false, message: "Respuesta inválida de Mercado Pago" }, { status: 502 });
    await db.collection("orders").updateOne({ _id: new ObjectId(orderId) }, { $set: { preferenceId, initPoint, updatedAt: new Date() } });
    return NextResponse.json({ success: true, preferenceId, initPoint });
  } catch (error) {
    console.error("Mercado Pago preference initialization failed", { errorType: error instanceof Error ? error.name : "unknown" });
    return NextResponse.json({ success: false, message: "Error interno procesando pago" }, { status: 500 });
  }
}

import { createHash, randomBytes, timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { ObjectId } from "mongodb";
import { authOptions } from "@/auth";
import { normalizeEmail } from "@/lib/auth-validation";
import { hashGuestAccessToken } from "@/lib/payment";
import { getDb } from "@/lib/mongo";
import { checkRateLimit, requestIdentifier } from "@/lib/request-rate-limit";
import { hasJsonContentType, hasTrustedOrigin } from "@/lib/request-security";

type Customer = { firstName: string; lastName: string; email: string; phone: string; address: string; city: string; province: string; postalCode: string };
type OrderItem = { _id: string; name: string; price: number; quantity: number; image?: string; _internal: { supplier: unknown; supplierId: unknown; costPrice: unknown; sku: unknown; shippingDays: unknown; margin: unknown } };
type CheckoutOrder = Record<string, unknown>;

function object(value: unknown): Record<string, unknown> | null { return value && typeof value === "object" ? value as Record<string, unknown> : null; }
function text(value: unknown, max: number): string | null { return typeof value === "string" && value.trim().length > 0 && value.trim().length <= max ? value.trim() : null; }
function digest(value: string) { return createHash("sha256").update(value).digest("hex"); }
function secureEqual(left: string, right: string) { const a = Buffer.from(left); const b = Buffer.from(right); return a.length === b.length && timingSafeEqual(a, b); }

function parseCustomer(value: unknown): Customer | null {
  const body = object(value);
  const firstName = text(body?.firstName, 80); const lastName = text(body?.lastName, 80); const phone = text(body?.phone, 40);
  const address = text(body?.address, 200); const city = text(body?.city, 100); const province = text(body?.province, 100); const postalCode = text(body?.postalCode, 20);
  const email = typeof body?.email === "string" ? normalizeEmail(body.email) : "";
  if (!firstName || !lastName || !phone || !address || !city || !province || !postalCode || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) return null;
  return { firstName, lastName, email, phone, address, city, province, postalCode };
}

function readIdempotencyKey(request: Request) {
  const value = request.headers.get("idempotency-key")?.trim() ?? "";
  return /^[A-Za-z0-9_-]{24,128}$/.test(value) ? value : null;
}

function responseForOrder(order: CheckoutOrder, guestAccessToken?: string) {
  return NextResponse.json({ success: true, reused: order.idempotencyKey !== undefined, orderId: String(order._id), orderNumber: order.orderNumber, ...(guestAccessToken ? { guestAccessToken } : {}) });
}

function publicOrder(order: CheckoutOrder) {
  const items = Array.isArray(order.items) ? order.items.map((item) => {
    const value = object(item);
    return { _id: value?._id, name: value?.name, price: value?.price, quantity: value?.quantity, image: value?.image };
  }) : [];
  return { _id: order._id, orderNumber: order.orderNumber, items, subtotal: order.subtotal, shippingAmount: order.shippingAmount ?? 0, discountAmount: order.discountAmount ?? 0, total: order.total, currency: order.currency ?? "ARS", status: order.status, paymentStatus: order.paymentStatus, customerEmail: order.customerEmail, createdAt: order.createdAt, updatedAt: order.updatedAt };
}

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const orderId = new URL(request.url).searchParams.get("orderId");
    if (orderId) {
      if (!ObjectId.isValid(orderId)) return NextResponse.json({ success: false, message: "Pedido inválido" }, { status: 400 });
      const db = await getDb();
      const order = await db.collection("orders").findOne({ _id: new ObjectId(orderId) });
      if (!order) return NextResponse.json({ success: false, message: "Pedido no encontrado" }, { status: 404 });
      const guestAccessToken = request.headers.get("x-guest-order-token") ?? undefined;
      const ownerMatches = session?.user?.role === "admin" || (session?.user?.id && order.userId === session.user.id) || (!order.userId && session?.user?.email && order.customerEmail === normalizeEmail(session.user.email)) || (typeof guestAccessToken === "string" && typeof order.guestAccessTokenHash === "string" && secureEqual(hashGuestAccessToken(guestAccessToken), order.guestAccessTokenHash));
      if (!ownerMatches) return NextResponse.json({ success: false, message: "No autorizado" }, { status: 401 });
      return NextResponse.json({ success: true, order: publicOrder(order) });
    }
    if (!session?.user?.email) return NextResponse.json({ success: false, message: "No autenticado" }, { status: 401 });
    const db = await getDb();
    const filter = session.user.role === "admin" ? {} : session.user.id ? { $or: [{ userId: session.user.id }, { userId: { $exists: false }, customerEmail: normalizeEmail(session.user.email) }] } : { customerEmail: normalizeEmail(session.user.email) };
    const orders = await db.collection("orders").find(filter).sort({ createdAt: -1 }).toArray();
    return NextResponse.json({ success: true, orders: session.user.role === "admin" ? orders : orders.map(publicOrder) });
  } catch (error) {
    console.error("Orders query failed", { errorType: error instanceof Error ? error.name : "unknown" });
    return NextResponse.json({ success: false, message: "Error obteniendo pedidos" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!hasTrustedOrigin(request)) return NextResponse.json({ success: false, message: "Origen no permitido" }, { status: 403 });
  if (!hasJsonContentType(request)) return NextResponse.json({ success: false, message: "Content-Type inválido" }, { status: 415 });
  const limit = checkRateLimit(`order:${requestIdentifier(request)}`, 10, 10 * 60 * 1000);
  if (!limit.allowed) return NextResponse.json({ success: false, message: "Demasiadas solicitudes" }, { status: 429, headers: { "Retry-After": String(limit.retryAfter) } });
  const idempotencyKey = readIdempotencyKey(request);
  if (!idempotencyKey) return NextResponse.json({ success: false, message: "Falta una clave de idempotencia válida" }, { status: 400 });
  try {
    const body: unknown = await request.json();
    const payload = object(body);
    const customer = parseCustomer(payload?.customer);
    const rawItems = Array.isArray(payload?.items) && payload.items.length > 0 && payload.items.length <= 50 ? payload.items : null;
    if (!customer || !rawItems) return NextResponse.json({ success: false, message: "Datos de pedido inválidos" }, { status: 400 });
    const requested = rawItems.map((item) => object(item)).map((item) => ({ id: typeof item?._id === "string" ? item._id : "", quantity: item?.quantity })).filter((item) => item.id);
    if (requested.length !== rawItems.length) return NextResponse.json({ success: false, message: "Producto inválido" }, { status: 400 });
    const session = await getServerSession(authOptions);
    const guestAccessToken = typeof payload?.guestAccessToken === "string" && /^[A-Za-z0-9_-]{32,128}$/.test(payload.guestAccessToken) ? payload.guestAccessToken : undefined;
    if (!session?.user?.id && !guestAccessToken) return NextResponse.json({ success: false, message: "Falta el token seguro de compra invitada" }, { status: 400 });
    const owner = session?.user?.id ? `user:${session.user.id}` : `guest:${digest(customer.email)}`;
    const fingerprint = digest(JSON.stringify({ customer, items: requested.map((item) => ({ id: item.id, quantity: item.quantity })).sort((a, b) => a.id.localeCompare(b.id)) }));
    const db = await getDb();
    const existing = await db.collection("orders").findOne({ idempotencyOwner: owner, idempotencyKey });
    if (existing) {
      if (existing.idempotencyFingerprint !== fingerprint) return NextResponse.json({ success: false, message: "La clave de idempotencia corresponde a otra compra" }, { status: 409 });
      if (!session?.user?.id && (!guestAccessToken || typeof existing.guestAccessTokenHash !== "string" || !secureEqual(hashGuestAccessToken(guestAccessToken), existing.guestAccessTokenHash))) return NextResponse.json({ success: false, message: "No autorizado" }, { status: 401 });
      return responseForOrder(existing, session?.user?.id ? undefined : guestAccessToken);
    }

    const ids = requested.map((item) => item.id);
    const objectIds = ids.filter(ObjectId.isValid).map((id) => new ObjectId(id));
    const products = await db.collection("products").find({ active: { $ne: false }, $or: [{ _id: { $in: objectIds } }, { slug: { $in: ids } }, { sku: { $in: ids } }] }).toArray();
    const items: OrderItem[] = [];
    for (const requestItem of requested) {
      const quantity = typeof requestItem.quantity === "number" ? requestItem.quantity : NaN;
      if (!Number.isInteger(quantity) || quantity < 1 || quantity > 20) return NextResponse.json({ success: false, message: "Cantidad de producto inválida" }, { status: 400 });
      const product = products.find((candidate) => String(candidate._id) === requestItem.id || String(candidate.slug ?? "") === requestItem.id || String(candidate.sku ?? "") === requestItem.id);
      const price = product && typeof product.price === "number" ? product.price : NaN;
      const stock = product && typeof product.stockQuantity === "number" ? product.stockQuantity : typeof product?.stock === "number" ? product.stock : product?.stock === false ? 0 : undefined;
      if (!product || !Number.isFinite(price) || price <= 0 || (typeof stock === "number" && (stock <= 0 || quantity > stock))) return NextResponse.json({ success: false, message: "Producto no disponible" }, { status: 400 });
      items.push({ _id: String(product._id), name: String(product.name ?? product.title ?? "Producto"), price, quantity, image: typeof product.image === "string" ? product.image : undefined, _internal: { supplier: product.supplier ?? null, supplierId: product.supplierId ?? null, costPrice: product.costPrice ?? null, sku: product.sku ?? null, shippingDays: product.shippingDays ?? null, margin: product.margin ?? null } });
    }
    const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const shippingAmount = 0; const discountAmount = 0; const currency = String(process.env.MERCADOPAGO_CURRENCY ?? "ARS").trim().toUpperCase();
    const now = new Date();
    const order = { orderNumber: `AVG-${Date.now()}-${randomBytes(3).toString("hex")}`, customer, customerEmail: session?.user?.email ? normalizeEmail(session.user.email) : customer.email, ...(session?.user?.id ? { userId: session.user.id } : { guestAccessTokenHash: hashGuestAccessToken(guestAccessToken!) }), idempotencyOwner: owner, idempotencyKey, idempotencyFingerprint: fingerprint, items, subtotal, shippingAmount, discountAmount, total: subtotal + shippingAmount - discountAmount, currency, status: "pending", paymentStatus: "pending", paymentId: null, preferenceId: null, initPoint: null, createdAt: now, updatedAt: now };
    try {
      const result = await db.collection("orders").insertOne(order);
      return NextResponse.json({ success: true, reused: false, orderId: String(result.insertedId), orderNumber: order.orderNumber, ...(guestAccessToken ? { guestAccessToken } : {}) });
    } catch (error) {
      if (!(error && typeof error === "object" && "code" in error && error.code === 11000)) throw error;
      const concurrent = await db.collection("orders").findOne({ idempotencyOwner: owner, idempotencyKey });
      if (!concurrent) throw error;
      if (concurrent.idempotencyFingerprint !== fingerprint) return NextResponse.json({ success: false, message: "La clave de idempotencia corresponde a otra compra" }, { status: 409 });
      return responseForOrder(concurrent, session?.user?.id ? undefined : guestAccessToken);
    }
  } catch (error) {
    console.error("Order creation failed", { errorType: error instanceof Error ? error.name : "unknown" });
    return NextResponse.json({ success: false, message: "Error creando pedido" }, { status: 500 });
  }
}

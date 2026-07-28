import { randomBytes } from "crypto";
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

function object(value: unknown): Record<string, unknown> | null { return value && typeof value === "object" ? value as Record<string, unknown> : null; }
function text(value: unknown, max: number): string | null { return typeof value === "string" && value.trim().length > 0 && value.trim().length <= max ? value.trim() : null; }

function parseCustomer(value: unknown): Customer | null {
  const body = object(value);
  const firstName = text(body?.firstName, 80); const lastName = text(body?.lastName, 80); const phone = text(body?.phone, 40);
  const address = text(body?.address, 200); const city = text(body?.city, 100); const province = text(body?.province, 100); const postalCode = text(body?.postalCode, 20);
  const email = typeof body?.email === "string" ? normalizeEmail(body.email) : "";
  if (!firstName || !lastName || !phone || !address || !city || !province || !postalCode || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) return null;
  return { firstName, lastName, email, phone, address, city, province, postalCode };
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ success: false, message: "No autenticado" }, { status: 401 });
    const db = await getDb();
    const filter = session.user.role === "admin" ? {} : session.user.id ? { $or: [{ userId: session.user.id }, { userId: { $exists: false }, customerEmail: normalizeEmail(session.user.email) }] } : { customerEmail: normalizeEmail(session.user.email) };
    const orders = await db.collection("orders").find(filter).sort({ createdAt: -1 }).toArray();
    const safeOrders = orders.map((order) => {
      if (session.user.role === "admin") return order;
      const items = Array.isArray(order.items) ? order.items.map((item) => {
        const value = object(item);
        return { _id: value?._id, name: value?.name, price: value?.price, quantity: value?.quantity, image: value?.image };
      }) : [];
      return { _id: order._id, orderNumber: order.orderNumber, items, subtotal: order.subtotal, total: order.total, status: order.status, paymentStatus: order.paymentStatus, createdAt: order.createdAt, updatedAt: order.updatedAt };
    });
    return NextResponse.json({ success: true, orders: safeOrders });
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
  try {
    const body: unknown = await request.json();
    const payload = object(body);
    const customer = parseCustomer(payload?.customer);
    const rawItems = Array.isArray(payload?.items) && payload.items.length > 0 && payload.items.length <= 50 ? payload.items : null;
    if (!customer || !rawItems) return NextResponse.json({ success: false, message: "Datos de pedido inválidos" }, { status: 400 });
    const requested: Array<{ id: string; quantity: unknown }> = rawItems.map((item) => object(item)).map((item) => ({ id: typeof item?._id === "string" ? item._id : "", quantity: item?.quantity })).filter((item) => item.id);
    if (requested.length !== rawItems.length) return NextResponse.json({ success: false, message: "Producto inválido" }, { status: 400 });
    const session = await getServerSession(authOptions);
    const db = await getDb();
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
      if (!product || !Number.isFinite(price) || price <= 0 || (typeof stock === "number" && ((stock <= 0) || quantity > stock))) return NextResponse.json({ success: false, message: "Producto no disponible" }, { status: 400 });
      items.push({ _id: String(product._id), name: String(product.name ?? product.title ?? "Producto"), price, quantity, image: typeof product.image === "string" ? product.image : undefined, _internal: { supplier: product.supplier ?? null, supplierId: product.supplierId ?? null, costPrice: product.costPrice ?? null, sku: product.sku ?? null, shippingDays: product.shippingDays ?? null, margin: product.margin ?? null } });
    }
    const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const guestAccessToken = session?.user?.id ? null : randomBytes(32).toString("base64url");
    const now = new Date();
    const order = { orderNumber: `AVG-${Date.now()}-${randomBytes(3).toString("hex")}`, customer, customerEmail: session?.user?.email ? normalizeEmail(session.user.email) : customer.email, ...(session?.user?.id ? { userId: session.user.id } : { guestAccessTokenHash: hashGuestAccessToken(guestAccessToken!) }), items, subtotal, total: subtotal, status: "pending", paymentStatus: "pending", paymentId: null, preferenceId: null, initPoint: null, createdAt: now, updatedAt: now };
    const result = await db.collection("orders").insertOne(order);
    return NextResponse.json({ success: true, orderId: String(result.insertedId), orderNumber: order.orderNumber, ...(guestAccessToken ? { guestAccessToken } : {}) });
  } catch (error) {
    console.error("Order creation failed", { errorType: error instanceof Error ? error.name : "unknown" });
    return NextResponse.json({ success: false, message: "Error creando pedido" }, { status: 500 });
  }
}

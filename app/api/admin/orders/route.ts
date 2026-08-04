import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { ObjectId, type Document, type Filter } from "mongodb";
import { authOptions } from "@/auth";
import { getDb } from "@/lib/mongo";
import { validateOperationalTransition } from "@/lib/order-operational-status";

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ success: false, message: "No autorizado" }, { status: 401 });
  }
  if (session.user.role !== "admin") return NextResponse.json({ success: false, message: "No autorizado" }, { status: 403 });
  return null;
}

function pageNumber(value: string | null) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? Math.min(parsed, 10_000) : 1;
}

function escapedPattern(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function GET(request: Request) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  try {
    const params = new URL(request.url).searchParams;
    const page = pageNumber(params.get("page"));
    const limit = Math.min(Math.max(Number(params.get("limit")) || 25, 1), 100);
    const filter: Filter<Document> = {};
    for (const key of ["paymentStatus", "status", "fulfillmentStatus", "trackingStatus"] as const) {
      const value = params.get(key);
      if (value && /^[a-z_]{1,40}$/i.test(value)) filter[key] = value;
    }
    const customer = params.get("customer")?.trim();
    if (customer) filter["customer.email"] = { $regex: escapedPattern(customer), $options: "i" };
    const query = params.get("q")?.trim();
    if (query) filter.$or = [
      { orderNumber: { $regex: escapedPattern(query), $options: "i" } },
      ...(ObjectId.isValid(query) ? [{ _id: new ObjectId(query) }] : []),
    ];
    const from = params.get("from"); const to = params.get("to");
    const createdAt: Record<string, Date> = {};
    if (from && !Number.isNaN(new Date(from).getTime())) createdAt.$gte = new Date(from);
    if (to && !Number.isNaN(new Date(to).getTime())) createdAt.$lte = new Date(to);
    if (Object.keys(createdAt).length) filter.createdAt = createdAt;
    const db = await getDb();
    const orders = await db.collection("orders").find(filter, { projection: { paymentPayload: 0, mercadopagoPayload: 0, cjPayload: 0, guestOrderTokenHash: 0, idempotencyKey: 0 } }).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).toArray();
    const total = await db.collection("orders").countDocuments(filter);
    return NextResponse.json({ success: true, orders, pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) } });
  } catch (error) {
    console.error("ERROR ADMIN ORDERS:", error);
    return NextResponse.json({ success: false, message: "Error cargando pedidos" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  try {
    const body: unknown = await request.json();
    const candidate = body && typeof body === "object" ? body as Record<string, unknown> : null;
    const id = typeof candidate?.id === "string" ? candidate.id : "";
    if (!ObjectId.isValid(id)) return NextResponse.json({ success: false, message: "Pedido inválido" }, { status: 400 });
    const db = await getDb();
    const rawStatus = typeof candidate?.status === "string" ? candidate.status.toLowerCase() : "";

    // Normalize spanish/english status values to canonical internal values
    const statusMap: Record<string, string> = {
      pending: "pending",
      pendiente: "pending",
      processing: "processing",
      procesando: "processing",
      preparing: "processing",
      preparando: "processing",
      shipped: "shipped",
      enviado: "shipped",
      delivered: "delivered",
      entregado: "delivered",
      cancelled: "cancelled",
      cancelado: "cancelled",
    };

    if (!(rawStatus in statusMap)) return NextResponse.json({ success: false, message: "Estado operativo inválido" }, { status: 400 });
    const status = statusMap[rawStatus];

    const order = await db.collection("orders").findOne({ _id: new ObjectId(id) });
    if (!order) return NextResponse.json({ success: false, message: "Pedido no encontrado" }, { status: 404 });
    const decision = validateOperationalTransition(typeof order.status === "string" ? order.status : undefined, status, typeof order.paymentStatus === "string" ? order.paymentStatus : undefined);
    if (!decision.allowed) return NextResponse.json({ success: false, message: "Transición operativa no permitida" }, { status: 409 });
    if (decision.idempotent) return NextResponse.json({ success: true, idempotent: true });
    const timestamp = status === "processing" ? { processingAt: new Date() } : status === "shipped" ? { shippedAt: new Date() } : status === "delivered" ? { deliveredAt: new Date() } : { cancelledAt: new Date() };
    const update = await db.collection("orders").updateOne({ _id: new ObjectId(id), status: order.status, paymentStatus: order.paymentStatus }, { $set: { status, ...timestamp, updatedAt: new Date() } });
    if (!update.matchedCount) {
      const latest = await db.collection("orders").findOne({ _id: new ObjectId(id) });
      if (!latest) return NextResponse.json({ success: false, message: "Pedido no encontrado" }, { status: 404 });
      if (latest.status === status) return NextResponse.json({ success: true, status, idempotent: true });
      return NextResponse.json({ success: false, message: "La orden cambió de estado y la transición ya no es válida.", reason: typeof latest.paymentStatus === "string" && latest.paymentStatus !== order.paymentStatus ? "concurrent_payment_conflict" : "concurrent_state_conflict" }, { status: 409 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("ERROR UPDATE ORDER:", error);
    return NextResponse.json({ success: false, message: "Error actualizando pedido" }, { status: 500 });
  }
}

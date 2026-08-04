import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongo";
import { authOptions } from "@/auth";
import { validateOperationalTransition } from "@/lib/order-operational-status";
import { hasTrustedOrigin } from "@/lib/request-security";
import { checkRateLimit, requestIdentifier } from "@/lib/request-rate-limit";

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ success: false, message: "No autorizado" }, { status: 401 });
  }
  if (session.user.role !== "admin") return NextResponse.json({ success: false, message: "No autorizado" }, { status: 403 });
  return null;
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;
  if (!hasTrustedOrigin(request)) return NextResponse.json({ success: false, message: "Origen no permitido" }, { status: 403 });
  const rate = checkRateLimit(`admin-order:${requestIdentifier(request)}`, 20, 600_000);
  if (!rate.allowed) return NextResponse.json({ success: false, message: "Demasiadas solicitudes" }, { status: 429, headers: { "Retry-After": String(rate.retryAfter) } });

  try {
    const { id } = await context.params;
    if (!ObjectId.isValid(id)) return NextResponse.json({ success: false, message: "Pedido inválido" }, { status: 400 });
    const body: unknown = await request.json();
    const candidate = body && typeof body === "object" ? body as Record<string, unknown> : null;
    if (!candidate) return NextResponse.json({ success: false, message: "Pedido inválido" }, { status: 400 });
    const db = await getDb();

    const rawStatus = typeof candidate.status === "string" ? candidate.status.toLowerCase() : "";
    const statusMap: Record<string, string> = {
      pending: "pending",
      pendiente: "pending",
      processing: "processing",
      procesando: "processing",
      waiting_supplier: "waiting_supplier",
      "waiting supplier": "waiting_supplier",
      "esperando proveedor": "waiting_supplier",
      "espera proveedor": "waiting_supplier",
      "esperando-proveedor": "waiting_supplier",
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
    const session = await getServerSession(authOptions);
    const event = { type: `order.${status}`, timestamp: new Date(), actor: typeof session?.user?.email === "string" ? session.user.email.replace(/^(.).*(@.*)$/, "$1***$2") : "admin", source: "admin", summary: `${order.status ?? "pending"} → ${status}` };
    const history = Array.isArray(order.operationalEvents) ? order.operationalEvents : [];
    const update = await db.collection("orders").updateOne({ _id: new ObjectId(id), status: order.status, paymentStatus: order.paymentStatus }, { $set: { status, ...timestamp, operationalEvents: [...history, event], updatedAt: new Date() } });
    if (!update.matchedCount) {
      const latest = await db.collection("orders").findOne({ _id: new ObjectId(id) });
      if (!latest) return NextResponse.json({ success: false, message: "Pedido no encontrado" }, { status: 404 });
      if (latest.status === status) return NextResponse.json({ success: true, status, idempotent: true });
      return NextResponse.json({ success: false, message: "La orden cambió de estado y la transición ya no es válida.", reason: typeof latest.paymentStatus === "string" && latest.paymentStatus !== order.paymentStatus ? "concurrent_payment_conflict" : "concurrent_state_conflict" }, { status: 409 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("ERROR UPDATE ORDER STATUS:", error);
    return NextResponse.json({ success: false, message: "No se pudo actualizar el pedido" }, { status: 500 });
  }
}

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;
  const { id } = await context.params;
  if (!ObjectId.isValid(id)) return NextResponse.json({ success: false, message: "Pedido inválido" }, { status: 400 });
  try {
    const order = await (await getDb()).collection("orders").findOne({ _id: new ObjectId(id) }, { projection: { paymentPayload: 0, mercadopagoPayload: 0, cjPayload: 0, guestOrderTokenHash: 0, idempotencyKey: 0 } });
    if (!order) return NextResponse.json({ success: false, message: "Pedido no encontrado" }, { status: 404 });
    const paymentId = typeof order.paymentId === "string" ? `${order.paymentId.slice(0, 4)}…` : undefined;
    return NextResponse.json({ success: true, order: { ...order, _id: String(order._id), ...(paymentId ? { paymentId } : {}) } });
  } catch { return NextResponse.json({ success: false, message: "No se pudo cargar el pedido" }, { status: 500 }); }
}

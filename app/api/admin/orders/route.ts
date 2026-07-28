import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { ObjectId } from "mongodb";
import { authOptions } from "@/auth";
import { getDb } from "@/lib/mongo";

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email || session.user.role !== "admin") {
    return NextResponse.json({ success: false, message: "No autorizado" }, { status: 401 });
  }
  return null;
}

export async function GET() {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  try {
    const db = await getDb();
    const orders = await db.collection("orders").find({}).sort({ createdAt: -1 }).toArray();
    return NextResponse.json({ success: true, orders });
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
    if ("paymentStatus" in (candidate ?? {}) || "paymentId" in (candidate ?? {}) || "paidAt" in (candidate ?? {})) return NextResponse.json({ success: false, message: "El estado de pago sólo puede actualizarse mediante Mercado Pago" }, { status: 403 });
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

    const update: Record<string, unknown> = {
      status,
      updatedAt: new Date(),
    };

    await db.collection("orders").updateOne({ _id: new ObjectId(id) }, { $set: update });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("ERROR UPDATE ORDER:", error);
    return NextResponse.json({ success: false, message: "Error actualizando pedido" }, { status: 500 });
  }
}

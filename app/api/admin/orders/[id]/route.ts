import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongo";
import { authOptions } from "@/auth";

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email || session.user.role !== "admin") {
    return NextResponse.json({ success: false, message: "No autorizado" }, { status: 401 });
  }
  return null;
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  try {
    const { id } = await context.params;
    const body: unknown = await request.json();
    const candidate = body && typeof body === "object" ? body as Record<string, unknown> : null;
    if (!candidate || "paymentStatus" in candidate || "paymentId" in candidate || "paidAt" in candidate) return NextResponse.json({ success: false, message: "El estado de pago sólo puede actualizarse mediante Mercado Pago" }, { status: 403 });
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

    const update: Record<string, unknown> = {
      status,
      updatedAt: new Date(),
    };

    await db.collection("orders").updateOne(
      { _id: new ObjectId(id) },
      { $set: update }
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("ERROR UPDATE ORDER STATUS:", error);
    return NextResponse.json({ success: false, message: "No se pudo actualizar el pedido" }, { status: 500 });
  }
}

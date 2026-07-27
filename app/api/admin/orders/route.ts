import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { ObjectId } from "mongodb";
import { authOptions } from "@/auth";
import { getDb } from "@/lib/mongo";

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email || (session.user as any).role !== "admin") {
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
    const body = await request.json();
    const db = await getDb();
    const rawStatus = String(body.status ?? "pending").toLowerCase();

    // Normalize spanish/english status values to canonical internal values
    const statusMap: Record<string, string> = {
      pending: "pending",
      pendiente: "pending",
      paid: "paid",
      pagado: "paid",
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

    const status = statusMap[rawStatus] ?? "pending";

    const update: Record<string, unknown> = {
      status,
      updatedAt: new Date(),
    };

    // Only change paymentStatus for clear payment lifecycle transitions
    if (status === "paid") {
      update.paymentStatus = "approved";
    } else if (status === "cancelled") {
      update.paymentStatus = "rejected";
    }

    await db.collection("orders").updateOne({ _id: new ObjectId(body.id) }, { $set: update });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("ERROR UPDATE ORDER:", error);
    return NextResponse.json({ success: false, message: "Error actualizando pedido" }, { status: 500 });
  }
}

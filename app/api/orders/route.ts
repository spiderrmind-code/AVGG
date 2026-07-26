import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getDb } from "@/lib/mongo";
import type { OrderDocument } from "@/types/ecommerce";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const db = await getDb();
    const filter: Record<string, unknown> = {};
    const userRole = (session?.user as { role?: string } | undefined)?.role;

    if (session?.user?.email && userRole !== "admin") {
      filter.customerEmail = session.user.email;
    }

    const orders = await db.collection("orders").find(filter).sort({ createdAt: -1 }).toArray();
    return NextResponse.json({ success: true, orders });
  } catch (error) {
    console.error("ERROR GET ORDERS:", error);
    return NextResponse.json({ success: false, message: "Error obteniendo pedidos" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const body = await request.json();
    const db = await getDb();

    const orderNumber = `AVG-${Date.now()}`;
    const order: OrderDocument = {
      orderNumber,
      customer: body.customer,
      customerEmail: session?.user?.email ?? body.customer?.email ?? null,
      items: body.items,
      subtotal: body.subtotal,
      total: body.total,
      status: body.status ?? "pending",
      paymentStatus: body.paymentStatus ?? "pending",
      paymentId: body.paymentId,
      preferenceId: body.preferenceId,
      initPoint: body.initPoint,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await db.collection("orders").insertOne(order as never);
    return NextResponse.json({ success: true, orderId: result.insertedId, orderNumber });
  } catch (error) {
    console.error("ERROR CREATE ORDER:", error);
    return NextResponse.json({ success: false, message: "Error creando pedido" }, { status: 500 });
  }
}

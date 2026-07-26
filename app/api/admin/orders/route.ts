import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongo";

export async function GET() {
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
  try {
    const body = await request.json();
    const db = await getDb();
    const status = body.status ?? "pending";

    const update: Record<string, unknown> = {
      status,
      updatedAt: new Date(),
    };

    if (status === "paid") {
      update.paymentStatus = "approved";
    } else if (status === "cancelled") {
      update.paymentStatus = "rejected";
    } else {
      update.paymentStatus = "pending";
    }

    await db.collection("orders").updateOne({ _id: new ObjectId(body.id) }, { $set: update });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("ERROR UPDATE ORDER:", error);
    return NextResponse.json({ success: false, message: "Error actualizando pedido" }, { status: 500 });
  }
}

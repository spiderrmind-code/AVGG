import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongo";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const db = await getDb();

    await db.collection("orders").updateOne(
      { _id: new ObjectId(id) },
      { $set: { status: body.status ?? "pendiente", updatedAt: new Date() } }
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("ERROR UPDATE ORDER STATUS:", error);
    return NextResponse.json({ success: false, message: "No se pudo actualizar el pedido" }, { status: 500 });
  }
}

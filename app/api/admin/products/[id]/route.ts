import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongo";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const db = await getDb();

    await db.collection("products").updateOne({ _id: new ObjectId(id) }, { $set: { ...body, updatedAt: new Date() } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("ERROR UPDATE PRODUCT:", error);
    return NextResponse.json({ success: false, message: "Error actualizando producto" }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const db = await getDb();
    await db.collection("products").deleteOne({ _id: new ObjectId(id) });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("ERROR DELETE PRODUCT:", error);
    return NextResponse.json({ success: false, message: "Error eliminando producto" }, { status: 500 });
  }
}

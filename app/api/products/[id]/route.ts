import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongo";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;

    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, message: "ID de producto inválido" }, { status: 400 });
    }

    const db = await getDb();
    const product = await db.collection("products").findOne({ _id: new ObjectId(id) });

    if (!product) {
      return NextResponse.json({ success: false, message: "Producto no encontrado" }, { status: 404 });
    }

    return NextResponse.json({ success: true, product });
  } catch (error) {
    console.error("ERROR PRODUCT ID:", error);
    return NextResponse.json({ success: false, message: "Error obteniendo producto" }, { status: 500 });
  }
}
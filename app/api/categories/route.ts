import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongo";

export async function GET() {
  try {
    const db = await getDb();

    const categorias = await db
      .collection("categorias")
      .find({})
      .sort({ order: 1 })
      .toArray();

    const parents = categorias.filter((c) => !c.parentId);
    const withChildren = parents.map((parent) => ({
      ...parent,
      children: categorias.filter(
        (c) => c.parentId?.toString() === parent._id.toString()
      ),
    }));

    return NextResponse.json({ success: true, categories: withChildren });
  } catch (error) {
    console.error("Error /api/categories:", error);
    return NextResponse.json(
      { success: false, message: "Error al obtener categorías" },
      { status: 500 }
    );
  }
}
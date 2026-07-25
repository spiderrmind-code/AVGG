import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongo";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Number(searchParams.get("limit")) || 20;
    const category = searchParams.get("category");

    const db = await getDb();

    const filter: Record<string, unknown> = {};
    if (category) filter.category = category;

    const products = await db
      .collection("products")
      .find(filter)
      .limit(limit)
      .toArray();

    return NextResponse.json({ success: true, products });
  } catch (error) {
    console.error("Error /api/products:", error);
    return NextResponse.json(
      { success: false, message: "Error al obtener productos" },
      { status: 500 }
    );
  }
}
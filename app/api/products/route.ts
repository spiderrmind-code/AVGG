import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongo";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Number(searchParams.get("limit")) || 100;
    const category = searchParams.get("category");
    const featured = searchParams.get("featured") === "true";

    const db = await getDb();
    const filter: Record<string, unknown> = {
      active: { $ne: false },
      stock: { $ne: false },
    };

    if (category) {
      filter.category = { $regex: category, $options: "i" };
    }

    if (featured) {
      filter.featured = true;
    }

    const products = await db.collection("products").find(filter).sort({ featured: -1, createdAt: -1 }).limit(limit).toArray();

    return NextResponse.json({ success: true, products });
  } catch (error) {
    console.error("ERROR PRODUCTS:", error);
    return NextResponse.json({ success: false, message: "Error obteniendo productos" }, { status: 500 });
  }
}
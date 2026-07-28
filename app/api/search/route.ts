import { NextRequest, NextResponse } from "next/server";
import { escapeRegex, normalizePublicProduct } from "@/lib/catalog";
import { getDb } from "@/lib/mongo";

export async function GET(request: NextRequest) {
  try {
    const query = request.nextUrl.searchParams.get("q")?.trim() ?? "";
    if (!query) return NextResponse.json({ success: true, count: 0, results: [] });
    if (query.length > 80) return NextResponse.json({ success: false, message: "La búsqueda es demasiado larga" }, { status: 400 });

    const escapedQuery = escapeRegex(query);
    const products = await (await getDb()).collection("products").find({
      active: { $ne: false },
      $or: [
        { name: { $regex: escapedQuery, $options: "i" } },
        { title: { $regex: escapedQuery, $options: "i" } },
        { description: { $regex: escapedQuery, $options: "i" } },
        { category: { $regex: escapedQuery, $options: "i" } },
      ],
    }).limit(20).toArray();
    const results = products.map((product) => normalizePublicProduct(product)).filter((product) => product !== null);
    return NextResponse.json({ success: true, count: results.length, results });
  } catch (error) {
    console.error("API /search error:", error);
    return NextResponse.json({ success: false, message: "No se pudo realizar la búsqueda" }, { status: 503 });
  }
}

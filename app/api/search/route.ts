import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongo";

interface ProductSearchResult {
  _id: string;
  title?: string;
  name?: string;
  price?: number;
  image?: string;
}

export async function GET(req: NextRequest) {
  try {
    const query =
      req.nextUrl.searchParams.get("q")?.trim() || "";

    if (!query) {
      return NextResponse.json([]);
    }

    const client = await clientPromise;

    const dbName = process.env.MONGODB_DB || process.env.MONGODB_DB_NAME || "AVGCONNECTS";
    const db = client.db(dbName);

    const products = await db
      .collection("products")
      .find({
        active: { $ne: false },
        $or: [
          { name: { $regex: query, $options: "i" } },
          { title: { $regex: query, $options: "i" } },
          { description: { $regex: query, $options: "i" } },
          { category: { $regex: query, $options: "i" } },
          { sku: { $regex: query, $options: "i" } },
        ],
      })
      .limit(10)
      .toArray();

    const results: ProductSearchResult[] = products.map((product) => ({
      _id: product._id.toString(),
      title: product.title ?? product.name ?? "Producto",
      price: product.price ?? 0,
      image:
        product.image ??
        product.images?.[0] ??
        undefined,
    }));

    return NextResponse.json(results);
  } catch (error) {
    console.error("API /search error:", error);

    return NextResponse.json(
      {
        error: "No se pudo realizar la búsqueda",
      },
      {
        status: 500,
      }
    );
  }
}
import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongo";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const limitParam = Number(searchParams.get("limit"));
    const limit =
      limitParam > 0 && limitParam <= 100
        ? limitParam
        : 100;

    const category = searchParams.get("category");
    const featured = searchParams.get("featured") === "true";


    const db = await getDb();


    const filter: Record<string, unknown> = {
      active: { $ne: false },
      $or: [
        { stock: { $ne: false } },
        { stock: { $gt: 0 } },
      ],
    };


    if (category) {
      filter.category = {
        $regex: category,
        $options: "i",
      };
    }


    if (featured) {
      filter.featured = true;
    }


    const products = await db
      .collection("products")
      .find(filter)
      .sort({
        featured: -1,
        createdAt: -1,
      })
      .limit(limit)
      .toArray();



    // sanitize products before returning to clients
    const sanitized = products.map((p: any) => ({
      _id: String(p._id),
      name: p.name,
      title: p.title,
      description: p.description,
      price: Number(p.price ?? 0),
      comparePrice: p.comparePrice ? Number(p.comparePrice) : undefined,
      image: p.image ?? p.images?.[0] ?? undefined,
      category: p.category,
      slug: p.slug,
      featured: Boolean(p.featured),
      stock: p.stock,
      supplier: p.supplier ?? "Proveedor",
      shippingDays: p.shippingDays ?? "24-48 hs",
      sku: p.sku ?? null,
    }));

    return NextResponse.json({
      success: true,
      count: sanitized.length,
      products: sanitized,
    });


  } catch (error) {

    console.error("ERROR PRODUCTS:", error);


    return NextResponse.json(
      {
        success: false,
        message: "Error obteniendo productos",
      },
      {
        status: 500,
      }
    );
  }
}
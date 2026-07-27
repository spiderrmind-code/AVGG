import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongo";
import { sanitizeProductForClient } from "@/lib/sanitization";

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



    const sanitized = products.map((p: any) => sanitizeProductForClient(p));

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
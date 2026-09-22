import { NextResponse } from "next/server";
import { isValidCatalogSlug } from "@/lib/catalog";
import { getPublicCatalog } from "@/lib/public-catalog";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const limitParam = Number(searchParams.get("limit"));
    const limit = limitParam > 0 && limitParam <= 50 ? limitParam : 24;

    const pageParam = Number(searchParams.get("page"));
    const page =
      Number.isInteger(pageParam) && pageParam > 0 ? pageParam : 1;

    const category = searchParams.get("category");

    const featuredParam = searchParams.get("featured");
    const featured =
      featuredParam === "true"
        ? true
        : featuredParam === "false"
          ? false
          : undefined;

    if (category) {
      if (!isValidCatalogSlug(category)) {
        return NextResponse.json(
          {
            success: false,
            message: "Categoría inválida",
          },
          { status: 400 }
        );
      }
    }

    const sanitized = await getPublicCatalog({
      limit,
      page,
      ...(category ? { category } : {}),
      ...(featured !== undefined ? { featured } : {}),
    });

    return NextResponse.json({
      success: true,
      count: sanitized.length,
      products: sanitized,
      page,
      limit,
      hasMore: sanitized.length === limit,
    });
  } catch (error) {
    console.error("ERROR PRODUCTS:", error);

    return NextResponse.json(
      {
        success: false,
        message: "No se pudo cargar el catálogo",
      },
      { status: 503 }
    );
  }
}
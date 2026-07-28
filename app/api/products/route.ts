import { NextResponse } from "next/server";
import { buildCategorySearchTerms } from "@/lib/category-routing";
import { isValidCatalogSlug, normalizeCatalogSlug, normalizePublicProduct } from "@/lib/catalog";
import { getDb } from "@/lib/mongo";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limitParam = Number(searchParams.get("limit"));
    const limit = limitParam > 0 && limitParam <= 50 ? limitParam : 24;
    const category = searchParams.get("category");
    const featured = searchParams.get("featured") === "true";
    const filter: Record<string, unknown> = { active: { $ne: false } };

    const categoryTerms = category ? new Set(buildCategorySearchTerms(category).map(normalizeCatalogSlug)) : null;
    if (category) {
      if (!isValidCatalogSlug(category)) {
        return NextResponse.json({ success: false, message: "Categoría inválida" }, { status: 400 });
      }
    }
    if (featured) filter.featured = true;

    const products = await (await getDb()).collection("products").find(filter).sort({ featured: -1, createdAt: -1 }).limit(category ? 250 : limit).toArray();
    const sanitized = products.map((product) => normalizePublicProduct(product)).filter((product) => product !== null && product.inStock && (!categoryTerms || (product.categorySlug !== null && categoryTerms.has(product.categorySlug)))).slice(0, limit);

    return NextResponse.json({ success: true, count: sanitized.length, products: sanitized });
  } catch (error) {
    console.error("ERROR PRODUCTS:", error);
    return NextResponse.json({ success: false, message: "No se pudo cargar el catálogo" }, { status: 503 });
  }
}

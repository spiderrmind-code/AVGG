import { NextResponse } from "next/server";
import { normalizeCatalogSlug, normalizePublicProduct } from "@/lib/catalog";
import { getDb } from "@/lib/mongo";

type CategoryRecord = Record<string, unknown>;

function toCategory(record: CategoryRecord) {
  const name = typeof record.name === "string" ? record.name.trim() : "";
  const slugValue = typeof record.slug === "string" ? record.slug : name;
  const slug = normalizeCatalogSlug(slugValue);
  if (!name || !slug) return null;
  return {
    _id: String(record._id ?? slug), name, slug,
    ...(typeof record.description === "string" ? { description: record.description } : {}),
    ...(typeof record.image === "string" ? { image: record.image } : {}),
  };
}

export async function GET() {
  try {
    const db = await getDb();
    const [categoryDocuments, productDocuments] = await Promise.all([
      db.collection("categorias").find({ active: { $ne: false } }).sort({ order: 1, name: 1 }).toArray(),
      db.collection("products").find({ active: { $ne: false } }).toArray(),
    ]);
    const storedBySlug = new Map(
      categoryDocuments
        .map((document) => toCategory(document))
        .filter((category): category is NonNullable<typeof category> => category !== null)
        .map((category) => [category.slug, category]),
    );
    const productCategories = new Map<string, { name: string; count: number }>();

    for (const document of productDocuments) {
      const product = normalizePublicProduct(document);
      if (!product?.inStock || !product.categorySlug || !product.category) continue;
      const current = productCategories.get(product.categorySlug);
      productCategories.set(product.categorySlug, { name: current?.name ?? product.category, count: (current?.count ?? 0) + 1 });
    }

    const categories = Array.from(productCategories, ([slug, category]) => {
      const stored = storedBySlug.get(slug);
      return {
        _id: stored?._id ?? slug,
        name: stored?.name ?? category.name,
        slug,
        ...(stored?.description ? { description: stored.description } : {}),
        ...(stored?.image ? { image: stored.image } : {}),
        productCount: category.count,
        children: [] as Array<{ name: string; slug: string }>,
      };
    }).sort((left, right) => left.name.localeCompare(right.name, "es"));
    return NextResponse.json({ success: true, categories });
  } catch (error) {
    console.error("Error /api/categories:", error);
    return NextResponse.json({ success: false, message: "No se pudieron cargar las categorías" }, { status: 503 });
  }
}

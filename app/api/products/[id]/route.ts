import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { escapeRegex, isValidCatalogSlug, normalizePublicProduct } from "@/lib/catalog";
import { getDb } from "@/lib/mongo";
import { unstable_cache } from "next/cache";
import { PUBLIC_PRODUCT_CACHE_TAG } from "@/lib/public-catalog-cache";

const getCachedPublicProduct = unstable_cache(async (id: string) => {
  const db = await getDb();
  const product = ObjectId.isValid(id)
    ? await db.collection("products").findOne({ _id: new ObjectId(id), active: { $ne: false } })
    : isValidCatalogSlug(id)
      ? await db.collection("products").findOne({ slug: { $regex: `^${escapeRegex(id)}$`, $options: "i" }, active: { $ne: false } })
      : null;
  return product ? normalizePublicProduct(product) : null;
}, ["public-product"], { revalidate: 60, tags: [PUBLIC_PRODUCT_CACHE_TAG] });

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    if (!id || id.length > 120) {
      return NextResponse.json({ success: false, message: "Identificador de producto inválido" }, { status: 400 });
    }

    const safe = await getCachedPublicProduct(id);
    if (!safe) return NextResponse.json({ success: false, message: "Producto no encontrado" }, { status: 404 });
    if (!safe) return NextResponse.json({ success: false, message: "Producto no disponible" }, { status: 404 });

    return NextResponse.json({ success: true, product: safe });
  } catch (error) {
    console.error("ERROR PRODUCT:", error);
    return NextResponse.json({ success: false, message: "No se pudo cargar el producto" }, { status: 503 });
  }
}

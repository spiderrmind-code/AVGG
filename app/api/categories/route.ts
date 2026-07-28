import { NextResponse } from "next/server";
import { catalogCategories } from "@/data/catalog-categories";
import { normalizeCatalogSlug } from "@/lib/catalog";
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
    const documents = await db.collection("categorias").find({ active: { $ne: false } }).sort({ order: 1, name: 1 }).toArray();
    const stored = documents.map((document) => toCategory(document)).filter((category) => category !== null);
    const source = stored.length > 0
      ? stored
      : catalogCategories.map((category) => ({ _id: category.slug, name: category.name, slug: category.slug, description: category.description, image: category.image }));
    const categories = source.map((category) => ({ ...category, children: [] as Array<{ name: string; slug: string }> }));
    return NextResponse.json({ success: true, categories });
  } catch (error) {
    console.error("Error /api/categories:", error);
    return NextResponse.json({ success: false, message: "No se pudieron cargar las categorías" }, { status: 503 });
  }
}

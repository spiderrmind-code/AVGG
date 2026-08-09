import { normalizeCatalogSlug, normalizePublicProduct } from "@/lib/catalog";
import { getDb } from "@/lib/mongo";
import { revalidateTag, unstable_cache } from "next/cache";

export type PublicCategory = {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  image?: string;
  productCount: number;
  children: Array<{ name: string; slug: string }>;
};

type CategoryRecord = Record<string, unknown>;

function toStoredCategory(record: CategoryRecord) {
  const name = typeof record.name === "string" ? record.name.trim() : "";
  const slug = normalizeCatalogSlug(typeof record.slug === "string" ? record.slug : name);
  if (!name || !slug) return null;
  return {
    _id: String(record._id ?? slug), name, slug,
    ...(typeof record.description === "string" && record.description.trim() ? { description: record.description.trim() } : {}),
    ...(typeof record.image === "string" && record.image.trim() ? { image: record.image.trim() } : {}),
  };
}

export const PUBLIC_CATEGORIES_CACHE_TAG = "public-categories";

async function readPublicCategories(): Promise<PublicCategory[]> {
  try {
    const db = await getDb();
    const [categoryDocuments, productDocuments] = await Promise.all([
      db.collection("categorias").find({ active: { $ne: false } }).sort({ order: 1, name: 1 }).toArray(),
      db.collection("products").find({ active: { $ne: false } }).toArray(),
    ]);
    const storedBySlug = new Map(categoryDocuments.map((document) => toStoredCategory(document)).filter((category): category is NonNullable<typeof category> => category !== null).map((category) => [category.slug, category]));
    const productCategories = new Map<string, { name: string; count: number }>();
    for (const document of productDocuments) {
      const product = normalizePublicProduct(document);
      if (!product?.inStock || !product.categorySlug || !product.category) continue;
      const current = productCategories.get(product.categorySlug);
      productCategories.set(product.categorySlug, { name: current?.name ?? product.category, count: (current?.count ?? 0) + 1 });
    }
    return Array.from(productCategories, ([slug, category]) => {
      const stored = storedBySlug.get(slug);
      return { _id: stored?._id ?? slug, name: stored?.name ?? category.name, slug, ...(stored?.description ? { description: stored.description } : {}), ...(stored?.image ? { image: stored.image } : {}), productCount: category.count, children: [] };
    }).sort((left, right) => left.name.localeCompare(right.name, "es"));
  } catch {
    return [];
  }
}

const readCachedPublicCategories = unstable_cache(
  readPublicCategories,
  ["public-categories"],
  { revalidate: 60, tags: [PUBLIC_CATEGORIES_CACHE_TAG] },
);

/** The single public category read model. Database failures deliberately expose an empty catalogue. */
export async function getPublicCategories(): Promise<PublicCategory[]> {
  return readCachedPublicCategories();
}

export function invalidatePublicCategories() {
  revalidateTag(PUBLIC_CATEGORIES_CACHE_TAG, "max");
}

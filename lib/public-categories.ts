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
  const children = Array.isArray(record.children)
    ? record.children.flatMap((child): Array<{ name: string; slug: string }> => {
      if (!child || typeof child !== "object") return [];
      const value = child as Record<string, unknown>;
      const childName = typeof value.name === "string" ? value.name.trim() : "";
      const childSlug = normalizeCatalogSlug(typeof value.slug === "string" ? value.slug : childName);
      return childName && childSlug ? [{ name: childName, slug: childSlug }] : [];
    })
    : [];
  return {
    _id: String(record._id ?? slug), name, slug,
    ...(typeof record.description === "string" && record.description.trim() ? { description: record.description.trim() } : {}),
    ...(typeof record.image === "string" && record.image.trim() ? { image: record.image.trim() } : {}),
    children,
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
      if (!product?.inStock) continue;
      const categoryName = typeof document.category === "string" && document.category.trim() ? document.category.trim() : undefined;
      const categorySlug = typeof product.categorySlug === "string" && product.categorySlug.trim() ? product.categorySlug : (categoryName ? normalizeCatalogSlug(categoryName) : null);
      if (!categoryName || !categorySlug) continue;
      const current = productCategories.get(categorySlug);
      productCategories.set(categorySlug, { name: current?.name ?? categoryName, count: (current?.count ?? 0) + 1 });
    }
    const slugs = new Set([...storedBySlug.keys(), ...productCategories.keys()]);
    return Array.from(slugs, (slug) => {
      const stored = storedBySlug.get(slug);
      const derived = productCategories.get(slug);
      return {
        _id: stored?._id ?? slug,
        name: stored?.name ?? derived?.name ?? slug,
        slug,
        ...(stored?.description ? { description: stored.description } : {}),
        ...(stored?.image ? { image: stored.image } : {}),
        productCount: derived?.count ?? 0,
        children: stored?.children ?? [],
      };
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

import { unstable_cache } from "next/cache";
import { normalizePublicProduct, type PublicProduct } from "@/lib/catalog";
import { getDb } from "@/lib/mongo";
import { buildPublicCategoryFilter } from "@/lib/public-catalog-category-filter";
import { PUBLIC_CATALOG_CACHE_TAG } from "@/lib/public-catalog-cache";

export type PublicCatalogQuery = { limit: number; page?: number; category?: string; featured?: boolean };

const readPublicCatalog = unstable_cache(async (query: PublicCatalogQuery): Promise<PublicProduct[]> => {
  const filter: Record<string, unknown> = { active: { $ne: false } };
  if (query.featured) filter.featured = true;
  if (query.category) {
    Object.assign(filter, buildPublicCategoryFilter(query.category));
  }
  const page = Math.max(1, query.page ?? 1);
  const rows = await (await getDb()).collection("products").find(filter, { projection: { costPrice: 0, supplier: 0, supplierId: 0, cjCost: 0, paymentPayload: 0 } }).sort({ featured: -1, createdAt: -1, _id: 1 }).skip((page - 1) * query.limit).limit(query.limit).toArray();
  return rows.map(normalizePublicProduct).filter((product): product is PublicProduct => product !== null && product.inStock);
}, ["public-catalog"], { revalidate: 60, tags: [PUBLIC_CATALOG_CACHE_TAG] });

export async function getPublicCatalog(query: PublicCatalogQuery) { return readPublicCatalog(query); }

import { revalidatePath, revalidateTag } from "next/cache";

export const PUBLIC_CATALOG_CACHE_TAG = "public-catalog";
export const PUBLIC_PRODUCT_CACHE_TAG = "public-product";
export const PUBLIC_BANNERS_CACHE_TAG = "public-banners";

/** Call only after a successful administrative mutation affecting public catalogue data. */
export function invalidatePublicCatalog() {
  revalidateTag(PUBLIC_CATALOG_CACHE_TAG, "max");
  revalidateTag(PUBLIC_PRODUCT_CACHE_TAG, "max");
  revalidateTag(PUBLIC_BANNERS_CACHE_TAG, "max");
  revalidatePath("/");
  revalidatePath("/sitemap.xml");
}

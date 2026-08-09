import assert from "node:assert/strict";
import { mock } from "node:test";

const tags: string[] = [];
const paths: string[] = [];

async function main() {
  await mock.module("next/cache", { namedExports: {
    revalidateTag: (tag: string) => { tags.push(tag); },
    revalidatePath: (path: string) => { paths.push(path); },
    unstable_cache: <T extends (...args: never[]) => unknown>(fn: T) => fn,
  } });
  await mock.module("@/lib/mongo", { namedExports: { getDb: async () => ({}) } });
  const { invalidatePublicCatalog, PUBLIC_CATALOG_CACHE_TAG, PUBLIC_PRODUCT_CACHE_TAG, PUBLIC_BANNERS_CACHE_TAG } = await import("../../lib/public-catalog-cache");
  const { invalidatePublicCategories, PUBLIC_CATEGORIES_CACHE_TAG } = await import("../../lib/public-categories");
  invalidatePublicCatalog();
  invalidatePublicCategories();
  assert.deepEqual(tags.sort(), [PUBLIC_BANNERS_CACHE_TAG, PUBLIC_CATALOG_CACHE_TAG, PUBLIC_CATEGORIES_CACHE_TAG, PUBLIC_PRODUCT_CACHE_TAG].sort());
  assert.deepEqual(paths.sort(), ["/", "/sitemap.xml"].sort());
}

void main();

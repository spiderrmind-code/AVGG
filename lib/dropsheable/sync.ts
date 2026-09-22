import type { Collection, Document } from "mongodb";
import { getDropsheableProducts, getDropsheableStock } from "@/lib/dropsheable/client";
import { mapDropsheableProduct, unwrapProducts, unwrapStock, type DropsheableProduct, type DropsheableStock } from "@/lib/dropsheable/catalog";

export type DropsheableSyncOptions = {
  offsetStep?: number;
  maxPages?: number;
  dryRun?: boolean;
  fetchPage?: (offset: number) => Promise<DropsheableProduct[]>;
  fetchStock?: () => Promise<DropsheableStock[]>;
};

export type DropsheableSyncSummary = {
  productsFound: number;
  productsNew: number;
  productsExisting: number;
  productsWithoutCategory: number;
  productsWithoutStock: number;
  errors: number;
  dryRun: boolean;
};

export function buildDropsheableStockIndex(stock: DropsheableStock[]) {
  const stockById = new Map<string, DropsheableStock>();
  const stockBySku = new Map<string, DropsheableStock>();

  for (const item of stock) {
    const id = item?.ID !== undefined ? String(item.ID) : undefined;
    const sku = typeof item?.SKU === "string" && item.SKU.trim() ? item.SKU.trim() : undefined;

    if (id !== undefined) stockById.set(id, item);
    if (sku) stockBySku.set(sku, item);
  }

  return new Map<string, DropsheableStock>([
    ...Array.from(stockById.entries()),
    ...Array.from(stockBySku.entries()),
  ]);
}

export async function getAllDropsheableProducts(options: Pick<DropsheableSyncOptions, "offsetStep" | "maxPages" | "fetchPage"> = {}): Promise<DropsheableProduct[]> {
  const offsetStep = options.offsetStep ?? 50;
  const maxPages = options.maxPages ?? 500;
  const fetchPage = options.fetchPage ?? (async (offset) => unwrapProducts(await getDropsheableProducts({ offset })));

  const allProducts: DropsheableProduct[] = [];
  let offset = 0;
  let pageCount = 0;

  while (pageCount < maxPages) {
    const page = await fetchPage(offset);
    if (!page.length) break;

    allProducts.push(...page);
    pageCount += 1;
    offset += offsetStep;
  }

  return allProducts;
}

export async function normalizeProductCandidate(input: DropsheableProduct, stock?: DropsheableStock, collection?: Collection<Document>) {
  const mapped = mapDropsheableProduct(input, stock);
  if (!mapped) return null;

  const categoryName = mapped.category && mapped.category.trim() ? mapped.category.trim() : undefined;
  if (!categoryName || !collection) {
    return {
      ...mapped,
      category: categoryName,
    };
  }

  const categories = await collection.db.collection("categorias").find({ active: { $ne: false } }, { projection: { name: 1, slug: 1 } }).toArray();
  const existingCategories = categories.flatMap((category): { name: string; slug?: string }[] => typeof category.name === "string" && category.name.trim().length > 0 ? [{ name: category.name, ...(typeof category.slug === "string" ? { slug: category.slug } : {}) }] : []);

  const fallbackCategory = existingCategories[0]?.name?.trim();
  const resolvedCategory = categoryName ? existingCategories.find((category) => category.name.trim().toLowerCase() === categoryName.trim().toLowerCase())?.name?.trim() ?? fallbackCategory ?? categoryName : fallbackCategory ?? categoryName;

  return {
    ...mapped,
    category: resolvedCategory,
  };
}

export function isDocumentLike(value: unknown): value is Document {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export async function syncDropsheableCatalog(collection: Collection<Document>, options: DropsheableSyncOptions = {}): Promise<DropsheableSyncSummary & { processed: number }> {
  const offsetStep = options.offsetStep ?? 50;
  const maxPages = options.maxPages ?? 500;
  const dryRun = Boolean(options.dryRun);
  const fetchPage = options.fetchPage ?? (async (offset) => unwrapProducts(await getDropsheableProducts({ offset })));
  const fetchStock = options.fetchStock ?? (async () => unwrapStock(await getDropsheableStock()));

  const allProducts = await getAllDropsheableProducts({ offsetStep, maxPages, fetchPage });
  const stockItems = await fetchStock();
  const stockIndex = buildDropsheableStockIndex(stockItems);

  const summary: DropsheableSyncSummary & { processed: number } = {
    productsFound: allProducts.length,
    productsNew: 0,
    productsExisting: 0,
    productsWithoutCategory: 0,
    productsWithoutStock: 0,
    errors: 0,
    dryRun,
    processed: 0,
  };

  if (dryRun) {
    for (const product of allProducts) {
      const stockMatch = stockIndex.get(String(product.ID)) ?? (product.SKU ? stockIndex.get(product.SKU) : undefined);
      const mapped = await normalizeProductCandidate(product, stockMatch, collection);
      if (!mapped) {
        summary.errors += 1;
        continue;
      }
      summary.processed += 1;
      if (!mapped.category || !mapped.category.trim()) summary.productsWithoutCategory += 1;
      if (!mapped.stockQuantity || mapped.stockQuantity <= 0) summary.productsWithoutStock += 1;
      const existing = await collection.findOne({ $or: [{ dropsheableId: mapped.dropsheableId }, { supplierId: mapped.supplierId, sku: mapped.sku }] });
      if (existing) summary.productsExisting += 1;
      else summary.productsNew += 1;
    }
    return summary;
  }

  for (const product of allProducts) {
    try {
      const stockMatch = stockIndex.get(String(product.ID)) ?? (product.SKU ? stockIndex.get(product.SKU) : undefined);
      const mapped = await normalizeProductCandidate(product, stockMatch, collection);
      if (!mapped) {
        summary.errors += 1;
        continue;
      }

      summary.processed += 1;
      if (!mapped.category || !mapped.category.trim()) summary.productsWithoutCategory += 1;
      if (!mapped.stockQuantity || mapped.stockQuantity <= 0) summary.productsWithoutStock += 1;

      const existing = await collection.findOne({ $or: [{ dropsheableId: mapped.dropsheableId }, { supplierId: mapped.supplierId, sku: mapped.sku }] });
      const now = new Date();

      if (existing) {
        const update = {
          ...mapped,
          updatedAt: now,
          createdAt: existing.createdAt ?? mapped.createdAt ?? now,
        };
        await collection.updateOne({ _id: existing._id }, { $set: update });
        summary.productsExisting += 1;
        continue;
      }

      await collection.insertOne({
        ...mapped,
        createdAt: mapped.createdAt ?? now,
        updatedAt: now,
      });
      summary.productsNew += 1;
    } catch {
      summary.errors += 1;
    }
  }

  return summary;
}

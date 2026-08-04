import type { Collection } from "mongodb";

export type CjProduct = { cjId: string; name: string; description: string; image?: string; images: string[]; category: string; rawCategory?: string; costPrice?: number; stockQuantity?: number; variantId?: string; sku?: string; variants: Array<{ id: string; sku?: string; stock?: number; cost?: number; image?: string }> };
export type SyncResult = { created: number; updated: number; skipped: number; failed: number; errors: string[] };

const categoryMap: Record<string, string> = { "lady dresses": "vestidos-mujer", "facial care": "cuidado-facial", "home office storage": "organizacion-oficina" };
const stringValue = (value: unknown) => typeof value === "string" ? value.trim() : "";
const numberValue = (value: unknown) => { const number = typeof value === "number" ? value : Number(value); return Number.isFinite(number) && number >= 0 ? number : undefined; };

export function mapCjCategory(raw: string) {
  const key = raw.toLowerCase().trim();
  return categoryMap[key] ?? raw ?? "Sin categoría";
}

export function mapCjProduct(input: Record<string, unknown>): CjProduct | null {
  const cjId = stringValue(input.pid ?? input.productId ?? input.id);
  const name = stringValue(input.productNameEn ?? input.productName ?? input.name);
  if (!cjId || !name) return null;
  const rawCategory = stringValue(input.categoryName ?? input.category);
  const images = [input.productImage, ...(Array.isArray(input.images) ? input.images : []), ...(Array.isArray(input.productImageSet) ? input.productImageSet : [])].map(stringValue).filter(Boolean);
  const variants = Array.isArray(input.variants) ? input.variants : Array.isArray(input.variantList) ? input.variantList : [];
  const mappedVariants = variants.map((variant) => {
    const record = variant && typeof variant === "object" ? variant as Record<string, unknown> : {};
    const id = stringValue(record.vid ?? record.variantId); const stock = numberValue(record.inventoryNum ?? record.stock ?? record.inventory);
    return id ? { id, ...(stringValue(record.variantSku ?? record.sku) ? { sku: stringValue(record.variantSku ?? record.sku) } : {}), ...(stock !== undefined ? { stock } : {}), ...(numberValue(record.variantSellPrice ?? record.costPrice) !== undefined ? { cost: numberValue(record.variantSellPrice ?? record.costPrice) } : {}), ...(stringValue(record.variantImage) ? { image: stringValue(record.variantImage) } : {}) } : null;
  }).filter((variant): variant is NonNullable<typeof variant> => variant !== null);
  const directStock = numberValue(input.stock ?? input.inventory ?? input.totalStock);
  const variantStocks = mappedVariants.map((variant) => variant.stock).filter((stock): stock is number => stock !== undefined);
  const stockQuantity = directStock ?? (variantStocks.length === mappedVariants.length && mappedVariants.length > 0 ? variantStocks.reduce((total, stock) => total + stock, 0) : undefined);
  return { cjId, name, description: stringValue(input.description ?? input.productDescription), ...(images[0] ? { image: images[0] } : {}), images, category: mapCjCategory(rawCategory), ...(rawCategory ? { rawCategory } : {}), ...(numberValue(input.sellPrice ?? input.costPrice ?? input.price) !== undefined ? { costPrice: numberValue(input.sellPrice ?? input.costPrice ?? input.price) } : {}), ...(stockQuantity !== undefined ? { stockQuantity } : {}), ...(mappedVariants[0]?.id ? { variantId: mappedVariants[0].id } : {}), ...(stringValue(input.sku ?? input.productSku) ? { sku: stringValue(input.sku ?? input.productSku) } : {}), variants: mappedVariants };
}

export async function upsertCjProducts(collection: Collection, products: CjProduct[], options: { dryRun: boolean; salePrice?: number }): Promise<SyncResult> {
  const result: SyncResult = { created: 0, updated: 0, skipped: 0, failed: 0, errors: [] };
  for (const product of products) {
    try {
      const existing = await collection.findOne({ cjId: product.cjId });
      if (!existing && (!options.salePrice || options.salePrice <= 0)) { result.skipped++; result.errors.push(`${product.cjId}: falta precio de venta explícito`); continue; }
      const stockConfirmed = product.stockQuantity !== undefined;
      const syncFields = { name: product.name, ...(product.description ? { description: product.description } : {}), ...(product.image ? { image: product.image } : {}), images: product.images, ...(product.costPrice !== undefined ? { costPrice: product.costPrice, cjCost: product.costPrice } : {}), category: existing?.category ?? product.category, supplier: "CJ Dropshipping", supplierId: "cj", cjId: product.cjId, ...(product.variantId ? { cjVariantId: product.variantId } : {}), ...(product.sku ? { cjSku: product.sku } : {}), ...(product.rawCategory ? { cjRawCategory: product.rawCategory } : {}), cjVariants: product.variants, ...(stockConfirmed ? { stockQuantity: product.stockQuantity, stock: product.stockQuantity! > 0, cjStock: product.stockQuantity, syncStatus: "synced" } : { stock: false, syncStatus: "stock_unconfirmed" }), source: "cj", cjLastSyncAt: new Date(), updatedAt: new Date() };
      if (options.dryRun) {
        if (existing) result.updated++;
        else result.created++;
        continue;
      }
      if (existing) { await collection.updateOne({ _id: existing._id }, { $set: syncFields }); result.updated++; }
      else { await collection.insertOne({ ...syncFields, price: options.salePrice!, comparePrice: undefined, featured: false, active: stockConfirmed && product.stockQuantity! > 0, createdAt: new Date() }); result.created++; }
    } catch { result.failed++; result.errors.push(`${product.cjId}: no se pudo sincronizar`); }
  }
  return result;
}

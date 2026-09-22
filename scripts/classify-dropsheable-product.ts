import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

async function main() {
  const externalId = process.argv[2]?.trim();
  if (!externalId) throw new Error("Falta el dropsheableId");
  const { getDb } = await import("@/lib/mongo");
  const { classifyStoredDropsheableProduct } = await import("@/lib/dropsheable/catalog");
  const result = await classifyStoredDropsheableProduct((await getDb()).collection("products"), externalId);
  const product = result.product;
  console.log(JSON.stringify({
    externalId,
    reason: result.reason,
    category: result.category ?? null,
    updated: result.updated,
    price: product.price,
    stock: product.stock,
    stockQuantity: product.stockQuantity,
    sku: product.sku,
    dropsheableId: product.dropsheableId,
  }, null, 2));
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "No se pudo clasificar el producto");
  process.exitCode = 1;
});
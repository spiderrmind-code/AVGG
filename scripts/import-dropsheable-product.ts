import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

async function main() {
  const { getDb } = await import("@/lib/mongo");
  const { importDropsheableProduct } = await import("@/lib/dropsheable/catalog");
  const externalId = process.argv[2]?.trim();
  const result = await importDropsheableProduct((await getDb()).collection("products"), externalId);
  console.log(JSON.stringify({
    action: result.action,
    mongoId: result.mongoId,
    dropsheableId: result.mapped.dropsheableId,
    name: result.mapped.name,
    price: result.mapped.price,
    stock: result.mapped.stock,
    stockQuantity: result.mapped.stockQuantity,
    sku: result.mapped.sku,
    images: result.mapped.images,
    supplier: result.mapped.supplier,
  }, null, 2));
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "No se pudo importar el producto Dropsheable");
  process.exitCode = 1;
});
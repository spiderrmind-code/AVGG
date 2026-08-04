import { getCjVariantStock, quoteCjShipping } from "../lib/cj/client";

async function main() {
  if (process.env.CJ_LIVE_READ_ENABLED !== "true") {
    console.log("SKIPPED — CJ_LIVE_READ_ENABLED=false");
    return;
  }
  const pid = process.env.CJ_TEST_PRODUCT_ID?.trim(); const variantId = process.env.CJ_TEST_VARIANT_ID?.trim(); const sku = process.env.CJ_TEST_SKU?.trim();
  const countryCode = process.env.CJ_TEST_COUNTRY_CODE?.trim().toUpperCase(); const postalCode = process.env.CJ_TEST_POSTAL_CODE?.trim(); const province = process.env.CJ_TEST_PROVINCE?.trim(); const city = process.env.CJ_TEST_CITY?.trim();
  const quantity = Number(process.env.CJ_TEST_QUANTITY ?? "1");
  if (!pid || !variantId || !sku || !countryCode || !postalCode || !province || !city || !Number.isInteger(quantity) || quantity < 1) throw new Error("Faltan variables de verificación CJ de solo lectura");
  const stock = await getCjVariantStock({ pid, variantId, sku, quantity });
  const shipping = await quoteCjShipping({ variantId, quantity, countryCode, postalCode, province, city });
  console.log(`CJ live read: PASS\nStock: ${stock.status}\nOpciones logísticas: ${shipping.length}\nPedidos CJ reales: 0\nEscrituras externas: 0`);
}
void main().catch((error: unknown) => { console.error(error instanceof Error ? error.message : "Error de verificación CJ"); process.exitCode = 1; });

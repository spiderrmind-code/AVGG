import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

async function main() {
  const { getDb } = await import("@/lib/mongo");
  const { syncDropsheableCatalog } = await import("@/lib/dropsheable/sync");
  const dryRun = process.argv.includes("--dry-run");

  console.log(dryRun ? "Dropsheable catalog sync (dry-run)" : "Dropsheable catalog sync");

  const db = await getDb();
  const summary = await syncDropsheableCatalog(db.collection("products"), { dryRun });

  console.log(`Productos encontrados: ${summary.productsFound}`);
  console.log(`Productos nuevos: ${summary.productsNew}`);
  console.log(`Productos existentes: ${summary.productsExisting}`);
  console.log(`Productos sin categoría: ${summary.productsWithoutCategory}`);
  console.log(`Productos sin stock: ${summary.productsWithoutStock}`);
  console.log(`Errores: ${summary.errors}`);
}

main().catch((error) => {
  console.error("Error crítico del sincronizador Dropsheable");
  console.error(error instanceof Error ? error.message : "Error desconocido");
  process.exitCode = 1;
});

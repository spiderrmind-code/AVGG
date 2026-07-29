import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

function sanitizedMongoError(error: unknown) {
  return {
    errorType: error instanceof Error ? error.name : "unknown",
    message: "No se pudo conectar a MongoDB dentro del tiempo configurado",
  };
}

async function duplicateIds(db: Awaited<ReturnType<typeof import("../lib/mongo")["getDb"]>>, collection: string) {
  const result = await db.collection(collection).aggregate([
    { $group: { _id: "$_id", count: { $sum: 1 } } },
    { $match: { count: { $gt: 1 } } },
    { $count: "groups" },
  ]).toArray();
  return Number(result[0]?.groups ?? 0);
}

async function duplicateCategoryNames(db: Awaited<ReturnType<typeof import("../lib/mongo")["getDb"]>>) {
  const result = await db.collection("categorias").aggregate([
    { $match: { name: { $type: "string" } } },
    { $group: { _id: { $toLower: { $trim: { input: "$name" } } }, count: { $sum: 1 } } },
    { $match: { count: { $gt: 1 } } },
    { $count: "groups" },
  ]).toArray();
  return Number(result[0]?.groups ?? 0);
}

async function main() {
  const startedAt = performance.now();
  const watchdog = setTimeout(() => {
    const connectionMs = Math.round(performance.now() - startedAt);
    console.error("Database verification failed", {
      errorType: "MongoConnectionTimeout",
      message: "No se pudo conectar a MongoDB dentro del tiempo configurado",
      connectionMs,
    });
    process.exit(1);
  }, 12_000);
  const { default: clientPromise, getDb } = await import("../lib/mongo");
  const { findDuplicateGroups, regularIndexes, uniqueIndexCandidates } = await import("./database-integrity");
  let client: Awaited<typeof clientPromise> | undefined;

  try {
    const db = await getDb();
    client = await clientPromise;
    const connectionMs = Math.round(performance.now() - startedAt);
    console.log(`conexion MongoDB: OK (${connectionMs} ms)`);
    console.log(`base seleccionada: ${db.databaseName}`);

    const collections = await db.listCollections({}, { nameOnly: true }).toArray();
    const names = new Set(collections.map((collection) => collection.name));
    for (const collection of ["users", "products", "orders", "categorias", "suppliers", "banners"]) {
      console.log(`${names.has(collection) ? "OK" : "INFO"} coleccion ${collection}`);
    }

    const [productCount, categoryCount, duplicates, categoryNameDuplicates] = await Promise.all([
      db.collection("products").countDocuments(),
      db.collection("categorias").countDocuments(),
      findDuplicateGroups(),
      duplicateCategoryNames(db),
    ]);
    console.log(`productos: ${productCount}`);
    console.log(`categorias: ${categoryCount}`);
    console.log(`categorias duplicadas por nombre: ${categoryNameDuplicates}`);

    for (const collection of ["users", "products", "orders", "categorias"]) {
      console.log(`IDs duplicados ${collection}: ${await duplicateIds(db, collection)}`);
    }
    for (const report of duplicates) {
      console.log(`${report.groups ? "ERROR" : "OK"} duplicados ${report.collection}.${report.field}: grupos=${report.groups}, documentos=${report.documents}`);
    }

    const expected = [...regularIndexes.map((index) => ({ collection: index.collection, name: index.name })), ...uniqueIndexCandidates.map((index) => ({ collection: index.collection, name: index.name }))];
    for (const index of expected) {
      const indexes = await db.collection(index.collection).listIndexes().toArray();
      console.log(`${indexes.some((item) => item.name === index.name) ? "OK" : "INFO"} indice ${index.name}`);
    }

    const hello = await db.command({ hello: 1 }) as { setName?: string; logicalSessionTimeoutMinutes?: number };
    const transactionsSupported = Boolean(hello.setName && hello.logicalSessionTimeoutMinutes);
    console.log(`transacciones: ${transactionsSupported ? "OK (replica set detectado)" : "NO CONFIRMADAS"}`);
    if (duplicates.some((report) => report.groups > 0) || categoryNameDuplicates > 0 || !transactionsSupported) process.exitCode = 1;
  } catch (error) {
    const connectionMs = Math.round(performance.now() - startedAt);
    console.error("Database verification failed", { ...sanitizedMongoError(error), connectionMs });
    process.exitCode = 1;
  } finally {
    clearTimeout(watchdog);
    await client?.close();
    if (process.exitCode && process.exitCode !== 0) process.exit(process.exitCode);
  }
}

void main();

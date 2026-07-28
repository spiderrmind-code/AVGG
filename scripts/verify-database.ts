import "dotenv/config";
import clientPromise, { getDb } from "../lib/mongo";
import { findDuplicateGroups, regularIndexes, uniqueIndexCandidates } from "./database-integrity";

async function main() {
  const db = await getDb();
  const collections = await db.listCollections({}, { nameOnly: true }).toArray();
  const names = new Set(collections.map((collection) => collection.name));
  for (const collection of ["users", "products", "orders", "categorias", "suppliers", "banners"]) console.log(`${names.has(collection) ? "✓" : "ℹ"} colección ${collection}`);
  const duplicates = await findDuplicateGroups();
  for (const report of duplicates) console.log(`${report.groups ? "✗" : "✓"} duplicados ${report.collection}.${report.field}: grupos=${report.groups}, documentos=${report.documents}`);
  const expected = [...regularIndexes.map((index) => ({ collection: index.collection, name: index.name })), ...uniqueIndexCandidates.map((index) => ({ collection: index.collection, name: index.name }))];
  for (const index of expected) {
    const indexes = await db.collection(index.collection).listIndexes().toArray();
    console.log(`${indexes.some((item) => item.name === index.name) ? "✓" : "ℹ"} índice ${index.name}`);
  }
  const hello = await db.command({ hello: 1 }) as { setName?: string; logicalSessionTimeoutMinutes?: number };
  console.log(`${hello.setName && hello.logicalSessionTimeoutMinutes ? "✓" : "✗"} transacciones: ${hello.setName && hello.logicalSessionTimeoutMinutes ? "replica set detectado" : "topología no confirmada"}`);
  if (!process.env.MONGODB_URI && process.env.MONGO_URI) console.log("ℹ usando fallback MONGO_URI heredado");
  if (!process.env.MONGODB_URI && !process.env.MONGO_URI) process.exitCode = 1;
  if (duplicates.some((report) => report.groups > 0)) process.exitCode = 1;
  await (await clientPromise).close();
}

main().catch((error) => { console.error("Database verification failed", { errorType: error instanceof Error ? error.name : "unknown" }); process.exitCode = 1; });

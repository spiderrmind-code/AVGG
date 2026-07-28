import "dotenv/config";
import { getDb } from "../lib/mongo";
import { findDuplicateGroups, regularIndexes, uniqueIndexCandidates } from "./database-integrity";

type IndexContext = {
  collection: string;
  indexName: string;
  keyPattern: Record<string, number>;
};

function redactMongoMessage(message: unknown) {
  return String(message ?? "Error MongoDB sin mensaje")
    .replace(/mongodb(?:\+srv)?:\/\/[^\s]+/gi, "mongodb://[REDACTED]")
    .replace(/dup key:\s*\{[^}]*\}/gi, "dup key: [REDACTED]");
}

function reportIndexError(error: unknown, context?: IndexContext) {
  const mongoError = error as { name?: unknown; code?: unknown; codeName?: unknown; message?: unknown; keyPattern?: unknown };
  const details = {
    errorName: typeof mongoError?.name === "string" ? mongoError.name : "unknown",
    errorCode: typeof mongoError?.code === "number" ? mongoError.code : null,
    codeName: typeof mongoError?.codeName === "string" ? mongoError.codeName : null,
    indexName: context?.indexName ?? null,
    collection: context?.collection ?? null,
    keyPattern: context?.keyPattern ?? mongoError?.keyPattern ?? null,
    mensaje: redactMongoMessage(mongoError?.message),
  };
  console.error("Index setup failed", details);
  if (details.errorCode === 11000) console.error("Índice único bloqueado por duplicados");
}

async function main() {
  const db = await getDb();
  const duplicates = await findDuplicateGroups();
  const blocked = new Set(duplicates.filter((report) => report.groups > 0).map((report) => `${report.collection}.${report.field}`));
  for (const index of regularIndexes) {
    const context: IndexContext = { collection: index.collection, indexName: index.name, keyPattern: index.key };
    try {
      await db.collection(index.collection).createIndex(index.key, { name: index.name });
    } catch (error) {
      reportIndexError(error, context);
      process.exitCode = 1;
      return;
    }
    console.log(`✓ ${index.name}`);
  }
  for (const index of uniqueIndexCandidates) {
    if (blocked.has(`${index.collection}.${index.field}`)) {
      console.log(`✗ ${index.name} omitido por duplicados`);
      continue;
    }
    const context: IndexContext = { collection: index.collection, indexName: index.name, keyPattern: { [index.field]: 1 } };
    try {
      await db.collection(index.collection).createIndex(context.keyPattern, { name: index.name, unique: true, partialFilterExpression: index.partialFilterExpression });
    } catch (error) {
      reportIndexError(error, context);
      process.exitCode = 1;
      return;
    }
    console.log(`✓ ${index.name}`);
  }
}

main().catch((error) => { reportIndexError(error); process.exitCode = 1; });

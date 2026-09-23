import fs from "node:fs";
import path from "node:path";
import { MongoClient, MongoClientOptions } from "mongodb";
import { logServerError } from "@/lib/logger";

export function normalizeMongoValue(value: string | undefined) {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;
  return /^mongodb(\+srv)?:\/\//.test(trimmed) ? trimmed : undefined;
}

function readDotEnvLocal() {
  const envPath = path.resolve(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) return {} as Record<string, string>;

  const values: Record<string, string> = {};
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!match) continue;
    const [, key, rawValue] = match;
    const value = rawValue.trim();
    if (value) values[key] = value;
  }
  return values;
}

export function resolveMongoConfig(
  env: NodeJS.ProcessEnv = process.env,
  fileEnv: Record<string, string> = readDotEnvLocal(),
) {
  const envUri = normalizeMongoValue(env.MONGODB_URI ?? env.MONGO_URI);
  const fileUri = normalizeMongoValue(fileEnv.MONGODB_URI ?? fileEnv.MONGO_URI);
  const uri = envUri ?? fileUri;

  const envDb = env.MONGODB_DB?.trim();
  const fileDb = fileEnv.MONGODB_DB?.trim();
  const dbName = (envDb && envDb.length > 1 ? envDb : fileDb) ?? "AVGCONNECTS";

  return { uri, dbName };
}

const fileEnv = readDotEnvLocal();
const resolvedMongo = resolveMongoConfig(process.env, fileEnv);

if (resolvedMongo.uri && process.env.MONGODB_URI !== resolvedMongo.uri) {
  process.env.MONGODB_URI = resolvedMongo.uri;
}
if (resolvedMongo.dbName && process.env.MONGODB_DB !== resolvedMongo.dbName) {
  process.env.MONGODB_DB = resolvedMongo.dbName;
}

const configuredUri = resolvedMongo.uri;

function mongoUriDiagnostics(value: string | undefined) {
  const normalized = value?.trim();
  return {
    exists: Boolean(value),
    length: value?.length ?? 0,
    startsWithMongoScheme: Boolean(normalized && (normalized.startsWith("mongodb://") || normalized.startsWith("mongodb+srv://"))),
  };
}

if (!process.env.MONGODB_URI && process.env.MONGO_URI) {
  console.warn('Using deprecated MongoDB environment variable "MONGO_URI"; migrate to "MONGODB_URI".');
}

if (!configuredUri) {
  throw new Error('Falta la variable de entorno "MONGODB_URI"');
}

if (!mongoUriDiagnostics(configuredUri).startsWithMongoScheme) {
  const diagnostics = mongoUriDiagnostics(configuredUri);
  throw new Error(`MONGODB_URI inválida: exists=${diagnostics.exists}; length=${diagnostics.length}; startsWithMongoScheme=${diagnostics.startsWithMongoScheme}`);
}

const uri = configuredUri;

const dbName = resolvedMongo.dbName;
const options: MongoClientOptions = {
  serverSelectionTimeoutMS: 8_000,
  connectTimeoutMS: 8_000,
  socketTimeoutMS: 20_000,
  waitQueueTimeoutMS: 10_000,
};

function connectionError(error: unknown) {
  const errorType = error instanceof Error ? error.name : "unknown";
  logServerError("mongodb_connection_unavailable", { errorType });
  return new Error("MongoDB no esta disponible");
}

function createClientPromise() {
  const client = new MongoClient(uri, options);
  const boundedConnection = new Promise<MongoClient>((resolve, reject) => {
    const timeout = setTimeout(() => {
      void client.close();
      reject(new Error("MongoDB connection timed out"));
    }, 10_000);
    client.connect().then(
      (connectedClient) => {
        clearTimeout(timeout);
        resolve(connectedClient);
      },
      (error) => {
        clearTimeout(timeout);
        void client.close();
        reject(error);
      },
    );
  });
  return boundedConnection.catch((error) => {
    if (process.env.NODE_ENV === "development") global._mongoClientPromise = undefined;
    throw connectionError(error);
  });
}

let clientPromise: Promise<MongoClient> | undefined;

declare global {
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

export function getClient() {
  if (process.env.NODE_ENV === "development") {
    if (!global._mongoClientPromise) {
      global._mongoClientPromise = createClientPromise();
    }
    return global._mongoClientPromise;
  }
  if (!clientPromise) clientPromise = createClientPromise();
  return clientPromise;
}

export async function getDb() {
  const client = await getClient();
  return client.db(dbName);
}

import { MongoClient, type MongoClientOptions } from "mongodb";
import { logServerError } from "@/lib/logger";

type StudioMongoEnvironment = {
  STUDIO_MONGODB_URI?: string;
  STUDIO_MONGODB_DB?: string;
  [key: string]: string | undefined;
};

export function resolveStudioMongoConfig(environment: StudioMongoEnvironment = process.env) {
  const uri = environment.STUDIO_MONGODB_URI?.trim().replace(/\\[rn]+$/i, "");
  const dbName = environment.STUDIO_MONGODB_DB?.trim().replace(/\\[rn]+$/i, "");

  if (!uri || !/^mongodb(\+srv)?:\/\//.test(uri)) {
    throw new Error('Falta una variable STUDIO_MONGODB_URI válida');
  }
  if (!dbName || dbName.length < 2 || dbName.toUpperCase() === "AVGCONNECTS") {
    throw new Error('STUDIO_MONGODB_DB debe identificar una base exclusiva del estudio');
  }

  return { uri, dbName };
}

export function isStudioMongoConfigured(environment: StudioMongoEnvironment = process.env) {
  try {
    resolveStudioMongoConfig(environment);
    return true;
  } catch {
    return false;
  }
}

const options: MongoClientOptions = {
  serverSelectionTimeoutMS: 8_000,
  connectTimeoutMS: 8_000,
  socketTimeoutMS: 20_000,
  waitQueueTimeoutMS: 10_000,
};

let clientPromise: Promise<MongoClient> | undefined;

declare global {
  var _studioMongoClientPromise: Promise<MongoClient> | undefined;
}

function createClientPromise() {
  const { uri } = resolveStudioMongoConfig();
  const client = new MongoClient(uri, options);
  return client.connect().catch((error: unknown) => {
    void client.close();
    logServerError("studio_mongodb_connection_unavailable", {
      errorType: error instanceof Error ? error.name : "unknown",
    });
    throw new Error("MongoDB del estudio no está disponible");
  });
}

function getClient() {
  if (process.env.NODE_ENV === "development") {
    if (!global._studioMongoClientPromise) {
      global._studioMongoClientPromise = createClientPromise();
    }
    return global._studioMongoClientPromise;
  }
  if (!clientPromise) clientPromise = createClientPromise();
  return clientPromise;
}

export async function getStudioDb() {
  const { dbName } = resolveStudioMongoConfig();
  const client = await getClient();
  return client.db(dbName);
}
import { MongoClient, MongoClientOptions } from "mongodb";

const configuredUri = process.env.MONGODB_URI ?? process.env.MONGO_URI;

if (!process.env.MONGODB_URI && process.env.MONGO_URI) {
  console.warn('Using deprecated MongoDB environment variable "MONGO_URI"; migrate to "MONGODB_URI".');
}

if (!configuredUri) {
  throw new Error('Falta la variable de entorno "MONGODB_URI"');
}

const uri = configuredUri;

const dbName = process.env.MONGODB_DB || "AVGCONNECTS";
const options: MongoClientOptions = {
  serverSelectionTimeoutMS: 8_000,
  connectTimeoutMS: 8_000,
  socketTimeoutMS: 20_000,
  waitQueueTimeoutMS: 10_000,
};

function connectionError(error: unknown) {
  const errorType = error instanceof Error ? error.name : "unknown";
  console.error("MongoDB connection unavailable", { errorType });
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
        reject(error);
      },
    );
  });
  return boundedConnection.catch((error) => {
    if (process.env.NODE_ENV === "development") global._mongoClientPromise = undefined;
    throw connectionError(error);
  });
}

let clientPromise: Promise<MongoClient>;

declare global {
  // eslint-disable-next-line no-var
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

if (process.env.NODE_ENV === "development") {
  if (!global._mongoClientPromise) {
    global._mongoClientPromise = createClientPromise();
  }
  clientPromise = global._mongoClientPromise;
} else {
  clientPromise = createClientPromise();
}

export default clientPromise;

export async function getDb() {
  const client = await clientPromise;
  return client.db(dbName);
}

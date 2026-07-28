import { MongoClient, MongoClientOptions } from "mongodb";

const uri = process.env.MONGODB_URI ?? process.env.MONGO_URI;

if (!process.env.MONGODB_URI && process.env.MONGO_URI) {
  console.warn('Using deprecated MongoDB environment variable "MONGO_URI"; migrate to "MONGODB_URI".');
}

if (!uri) {
  throw new Error('Falta la variable de entorno "MONGODB_URI"');
}

const dbName = process.env.MONGODB_DB || "AVGCONNECTS";
const options: MongoClientOptions = {};

let client: MongoClient;
let clientPromise: Promise<MongoClient>;

declare global {
  // eslint-disable-next-line no-var
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

if (process.env.NODE_ENV === "development") {
  if (!global._mongoClientPromise) {
    client = new MongoClient(uri, options);
    global._mongoClientPromise = client.connect();
  }
  clientPromise = global._mongoClientPromise;
} else {
  client = new MongoClient(uri, options);
  clientPromise = client.connect();
}

export default clientPromise;

export async function getDb() {
  const client = await clientPromise;
  return client.db(dbName);
}

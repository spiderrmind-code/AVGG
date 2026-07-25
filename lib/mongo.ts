import { MongoClient, MongoClientOptions } from "mongodb";

if (!process.env.MONGO_URI) {
  throw new Error('Falta la variable de entorno "MONGO_URI" en .env.local');
}

const uri = process.env.MONGO_URI;
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
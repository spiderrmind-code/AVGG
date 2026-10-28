import bcrypt from "bcryptjs";
import { MongoClient } from "mongodb";
import { normalizeEmail } from "../lib/auth-validation";
import { resolveStudioMongoConfig } from "../lib/studio-mongo";

const emailValue = process.env.STUDIO_ADMIN_EMAIL;
const password = process.env.STUDIO_ADMIN_PASSWORD;

if (!emailValue || !password || password.length < 14) {
  throw new Error("Configura STUDIO_ADMIN_EMAIL y una STUDIO_ADMIN_PASSWORD de al menos 14 caracteres.");
}

const email = normalizeEmail(emailValue);
const { uri, dbName } = resolveStudioMongoConfig();
const client = new MongoClient(uri, { serverSelectionTimeoutMS: 8_000, connectTimeoutMS: 8_000 });

try {
  await client.connect();
  const users = client.db(dbName).collection("users");
  if (await users.findOne({ email }, { projection: { _id: 1 } })) {
    throw new Error("La cuenta ya existe; no se modificó ningún usuario.");
  }

  const now = new Date();
  await users.insertOne({
    email,
    name: email,
    password: await bcrypt.hash(password, 12),
    role: "admin",
    provider: "credentials",
    createdAt: now,
    updatedAt: now,
  });
  console.log("Cuenta administrativa de Studio creada.");
} finally {
  await client.close();
}
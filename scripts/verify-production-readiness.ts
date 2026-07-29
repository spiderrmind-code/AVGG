import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

const required = [
  "MONGODB_URI",
  "MONGODB_DB",
  "NEXTAUTH_URL",
  "NEXTAUTH_SECRET",
  "MERCADOPAGO_ACCESS_TOKEN",
  "MERCADOPAGO_MODE",
  "MERCADOPAGO_WEBHOOK_SECRET",
  "NEXT_PUBLIC_APP_URL",
] as const;

function isConfigured(key: (typeof required)[number]): boolean {
  if (key === "MONGODB_URI") return Boolean(process.env.MONGODB_URI ?? process.env.MONGO_URI);
  return Boolean(process.env[key]?.trim());
}

function isValidMercadoPagoMode(value: string | undefined): boolean {
  return value === "sandbox" || value === "production";
}

function isValidProductionUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password && url.hostname !== "localhost" && url.hostname !== "127.0.0.1";
  } catch {
    return false;
  }
}

let valid = true;

for (const key of required) {
  const configured = isConfigured(key);
  console.log(`${configured ? "✓" : "✗"} ${key} ${configured ? "configurada" : "ausente"}`);
  valid &&= configured;
}

if (!isValidMercadoPagoMode(process.env.MERCADOPAGO_MODE?.trim().toLowerCase())) {
  console.log("ERROR MERCADOPAGO_MODE debe ser sandbox o production");
  valid = false;
}

const publicUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
if (!publicUrl) {
  console.log("ℹ URL de desarrollo resuelta: http://localhost:3000");
  if (process.env.NODE_ENV === "production") valid = false;
} else if (process.env.NODE_ENV === "production" && !isValidProductionUrl(publicUrl)) {
  console.log("✗ URL pública inválida");
  valid = false;
} else {
  console.log("✓ URL pública válida");
}

if (process.env.NODE_ENV === "production" && process.env.MERCADOPAGO_ALLOW_UNSIGNED_WEBHOOKS === "true") {
  console.log("✗ MERCADOPAGO_ALLOW_UNSIGNED_WEBHOOKS no puede estar habilitada en producción");
  valid = false;
}

process.exitCode = valid ? 0 : 1;

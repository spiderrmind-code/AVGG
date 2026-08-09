import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

export type SupplierStatus = "active" | "paused" | "blocked";
export type SupplierType = "manual" | "csv" | "api";
export type EncryptedSupplierCredentials = {
  version: 1;
  iv: string;
  ciphertext: string;
  tag: string;
};

export type SupplierInput = {
  name: string;
  description?: string;
  logo?: string;
  country?: string;
  city?: string;
  address?: string;
  contact?: string;
  email?: string;
  phone?: string;
  website?: string;
  status: SupplierStatus;
  type: SupplierType;
  externalId?: string;
  apiUrl?: string;
  credentials?: Record<string, string>;
};

function text(value: unknown, max: number): string | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  return typeof value === "string" && value.trim().length <= max ? value.trim() : undefined;
}

function url(value: unknown): string | undefined {
  const candidate = text(value, 2_000);
  if (!candidate) return undefined;
  try {
    const parsed = new URL(candidate);
    return parsed.protocol === "https:" || parsed.protocol === "http:" ? parsed.toString() : undefined;
  } catch {
    return undefined;
  }
}

function email(value: unknown): string | undefined {
  const candidate = text(value, 254);
  return candidate && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(candidate) ? candidate.toLowerCase() : undefined;
}

function credentials(value: unknown): Record<string, string> | undefined | null {
  if (value === undefined) return undefined;
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const entries = Object.entries(value);
  if (entries.length === 0 || entries.length > 20) return null;
  const result: Record<string, string> = {};
  for (const [key, rawValue] of entries) {
    if (!/^[A-Za-z][A-Za-z0-9_.-]{0,79}$/.test(key) || typeof rawValue !== "string" || rawValue.length === 0 || rawValue.length > 4_000) return null;
    result[key] = rawValue;
  }
  return JSON.stringify(result).length <= 16_000 ? result : null;
}

export function parseSupplierInput(value: unknown, options: { partial?: boolean } = {}): SupplierInput | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const source = value as Record<string, unknown>;
  const name = text(source.name, 160);
  if (!options.partial && !name) return null;
  if (source.name !== undefined && !name) return null;
  const status = source.status === undefined ? (options.partial ? undefined : "active") : source.status;
  const type = source.type === undefined ? (options.partial ? undefined : "manual") : source.type;
  if (status !== undefined && status !== "active" && status !== "paused" && status !== "blocked") return null;
  if (type !== undefined && type !== "manual" && type !== "csv" && type !== "api") return null;
  const parsedCredentials = credentials(source.credentials);
  if (parsedCredentials === null) return null;
  const apiUrl = url(source.apiUrl);
  const website = url(source.website);
  if (source.apiUrl !== undefined && !apiUrl) return null;
  if (source.website !== undefined && !website) return null;
  const parsedEmail = email(source.email);
  if (source.email !== undefined && !parsedEmail) return null;
  const optional = {
    ...(name ? { name } : {}),
    ...(text(source.description, 1_000) ? { description: text(source.description, 1_000)! } : {}),
    ...(url(source.logo) ? { logo: url(source.logo)! } : {}),
    ...(text(source.country, 80) ? { country: text(source.country, 80)! } : {}),
    ...(text(source.city, 80) ? { city: text(source.city, 80)! } : {}),
    ...(text(source.address, 300) ? { address: text(source.address, 300)! } : {}),
    ...(text(source.contact, 160) ? { contact: text(source.contact, 160)! } : {}),
    ...(parsedEmail ? { email: parsedEmail } : {}),
    ...(text(source.phone, 40) ? { phone: text(source.phone, 40)! } : {}),
    ...(website ? { website } : {}),
    ...(text(source.externalId, 160) ? { externalId: text(source.externalId, 160)! } : {}),
    ...(apiUrl ? { apiUrl } : {}),
    ...(parsedCredentials ? { credentials: parsedCredentials } : {}),
  };
  return { ...optional, ...(status ? { status } : {}), ...(type ? { type } : {}) } as SupplierInput;
}

function encryptionKey(value = process.env.SUPPLIER_CREDENTIALS_ENCRYPTION_KEY): Buffer {
  if (!value) throw new Error("Falta SUPPLIER_CREDENTIALS_ENCRYPTION_KEY");
  const key = Buffer.from(value, "base64");
  if (key.length !== 32) throw new Error("SUPPLIER_CREDENTIALS_ENCRYPTION_KEY debe codificar 32 bytes");
  return key;
}

export function encryptSupplierCredentials(value: Record<string, string>, keyValue?: string): EncryptedSupplierCredentials {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(keyValue), iv);
  const plaintext = Buffer.from(JSON.stringify(value), "utf8");
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  return { version: 1, iv: iv.toString("base64"), ciphertext: ciphertext.toString("base64"), tag: cipher.getAuthTag().toString("base64") };
}

export function decryptSupplierCredentials(value: EncryptedSupplierCredentials, keyValue?: string): Record<string, string> {
  if (value.version !== 1) throw new Error("Versión de credenciales no compatible");
  try {
    const decipher = createDecipheriv("aes-256-gcm", encryptionKey(keyValue), Buffer.from(value.iv, "base64"));
    decipher.setAuthTag(Buffer.from(value.tag, "base64"));
    const plaintext = Buffer.concat([decipher.update(Buffer.from(value.ciphertext, "base64")), decipher.final()]).toString("utf8");
    const parsed = credentials(JSON.parse(plaintext));
    if (!parsed) throw new Error("Credenciales inválidas");
    return parsed;
  } catch {
    throw new Error("No se pudieron descifrar las credenciales del proveedor");
  }
}

export function publicSupplierProjection() {
  return { credentialsEncrypted: 0, credentials: 0 };
}

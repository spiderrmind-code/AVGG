import assert from "node:assert/strict";
import test from "node:test";
import { decryptSupplierCredentials, encryptSupplierCredentials, parseSupplierInput, publicSupplierProjection } from "../lib/supplier-security";

const key = Buffer.alloc(32, 7).toString("base64");

test("supplier input uses an allowlist and rejects malformed sensitive fields", () => {
  const parsed = parseSupplierInput({ name: "Proveedor", type: "api", status: "active", apiUrl: "https://supplier.example/api", ignored: "must-not-persist" });
  assert.deepEqual(parsed, { name: "Proveedor", type: "api", status: "active", apiUrl: "https://supplier.example/api" });
  assert.equal(parseSupplierInput({ name: "Proveedor", type: "ftp" }), null);
  assert.equal(parseSupplierInput({ name: "Proveedor", credentials: { "bad key": "secret" } }), null);
});

test("supplier credentials use authenticated server-side encryption", () => {
  const encrypted = encryptSupplierCredentials({ apiKey: "secret-value" }, key);
  assert.notEqual(encrypted.ciphertext, "secret-value");
  assert.deepEqual(decryptSupplierCredentials(encrypted, key), { apiKey: "secret-value" });
  assert.throws(() => decryptSupplierCredentials({ ...encrypted, tag: Buffer.alloc(16).toString("base64") }, key), /No se pudieron descifrar/);
  assert.deepEqual(publicSupplierProjection(), { credentialsEncrypted: 0, credentials: 0 });
});

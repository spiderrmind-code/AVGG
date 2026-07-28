import test from "node:test";
import assert from "node:assert/strict";
import { normalizeEmail, normalizeRole, validateRegisterInput } from "../lib/auth-validation";

test("validateRegisterInput accepts a strong customer registration", () => {
  const result = validateRegisterInput({
    name: "Ana",
    lastName: "Pérez",
    email: "ana@example.com",
    phone: "1122334455",
    password: "SecurePass123!",
    confirmPassword: "SecurePass123!",
  });

  assert.equal(result.valid, true);
  assert.equal(result.errors.length, 0);
});

test("validateRegisterInput rejects mismatched passwords", () => {
  const result = validateRegisterInput({
    name: "Ana",
    lastName: "Pérez",
    email: "ana@example.com",
    phone: "1122334455",
    password: "SecurePass123!",
    confirmPassword: "Different123!",
  });

  assert.equal(result.valid, false);
  assert.ok(result.errors.some((error) => error.includes("coincid")));
});

test("normalize helpers map roles and emails consistently", () => {
  assert.equal(normalizeEmail("Ana@Example.com"), "ana@example.com");
  assert.equal(normalizeRole("ADMIN"), "admin");
  assert.equal(normalizeRole("customer"), "customer");
});

import assert from "node:assert/strict";
import test from "node:test";
import { resolveSafeAuthRedirect } from "../lib/auth-redirect";
import { getPublicUrlEnvironment, productionEnvironmentIssues, requireServerEnvironment } from "../lib/env";
import { checkReadiness } from "../lib/health";
import { sanitizeLogContext } from "../lib/logger";

test("selects the canonical public URL in the documented order", () => {
  assert.deepEqual(getPublicUrlEnvironment({ NEXT_PUBLIC_SITE_URL: "https://shop.example", NEXTAUTH_URL: "https://auth.example" }), { source: "NEXT_PUBLIC_SITE_URL", value: "https://shop.example" });
  assert.deepEqual(getPublicUrlEnvironment({ NEXTAUTH_URL: "https://auth.example", VERCEL_URL: "shop.vercel.app" }), { source: "NEXTAUTH_URL", value: "https://auth.example" });
});

test("reports missing production-only server configuration without exposing values", () => {
  const issues = productionEnvironmentIssues({ MONGODB_URI: "configured", MONGODB_DB: "AVGCONNECTS" });
  assert.ok(issues.includes("NEXTAUTH_SECRET"));
  assert.ok(issues.includes("PUBLIC_APP_URL"));
  assert.throws(() => requireServerEnvironment("MISSING", {}), /MISSING/);
});

test("health readiness reports database failures without details", async () => {
  assert.deepEqual(await checkReadiness(async () => undefined), { ready: true });
  assert.deepEqual(await checkReadiness(async () => { throw new Error("connection string must remain private"); }), { ready: false });
});

test("auth redirects remain on the configured origin", () => {
  const baseUrl = "https://shop.example";
  assert.equal(resolveSafeAuthRedirect("/account", baseUrl), "https://shop.example/account");
  assert.equal(resolveSafeAuthRedirect("https://shop.example/cart", baseUrl), "https://shop.example/cart");
  assert.equal(resolveSafeAuthRedirect("https://attacker.example", baseUrl), baseUrl);
});

test("logger context masks or removes sensitive values", () => {
  assert.deepEqual(sanitizeLogContext({ email: "buyer@example.test", token: "secret", authorization: "Bearer secret", route: "/api/orders", status: 503 }), { email: "b***@example.test", route: "/api/orders", status: 503 });
});

import assert from "node:assert/strict";
import test from "node:test";
import { checkRateLimit } from "../lib/request-rate-limit";
import { hasJsonContentType, hasTrustedOrigin } from "../lib/request-security";

test("rate limits return a retry window", () => {
  const key = `security-${Date.now()}`;
  assert.equal(checkRateLimit(key, 1, 60_000).allowed, true);
  const blocked = checkRateLimit(key, 1, 60_000);
  assert.equal(blocked.allowed, false);
  assert.ok(blocked.retryAfter > 0);
});

test("origin and JSON checks reject malformed browser mutations", () => {
  const original = process.env.NEXT_PUBLIC_APP_URL;
  process.env.NEXT_PUBLIC_APP_URL = "https://shop.example.com";
  assert.equal(hasTrustedOrigin(new Request("https://shop.example.com/api/orders", { headers: { Origin: "https://shop.example.com" } })), true);
  assert.equal(hasTrustedOrigin(new Request("https://shop.example.com/api/orders", { headers: { Origin: "https://attacker.example" } })), false);
  assert.equal(hasJsonContentType(new Request("https://shop.example.com/api/orders", { headers: { "Content-Type": "application/json; charset=utf-8" } })), true);
  if (original === undefined) delete process.env.NEXT_PUBLIC_APP_URL;
  else process.env.NEXT_PUBLIC_APP_URL = original;
});

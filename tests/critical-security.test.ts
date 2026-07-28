import assert from "node:assert/strict";
import test from "node:test";
import { hashGuestAccessToken } from "../lib/payment";
import { allowRequest } from "../lib/request-rate-limit";

test("guest order tokens are hashed deterministically and are not email-based", () => {
  const token = "secure-guest-token";
  assert.equal(hashGuestAccessToken(token), hashGuestAccessToken(token));
  assert.notEqual(hashGuestAccessToken(token), hashGuestAccessToken("other-token"));
});

test("order creation limiter blocks requests over its configured limit", () => {
  const key = `test-${Date.now()}`;
  assert.equal(allowRequest(key, 1, 60_000), true);
  assert.equal(allowRequest(key, 1, 60_000), false);
});

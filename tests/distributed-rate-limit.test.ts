import assert from "node:assert/strict";
import test from "node:test";
import { checkRateLimitDistributed } from "../lib/request-rate-limit";

const originalFetch = globalThis.fetch;
const originalUrl = process.env.RATE_LIMIT_REDIS_URL;
const originalToken = process.env.RATE_LIMIT_REDIS_TOKEN;

function restore() {
  globalThis.fetch = originalFetch;
  if (originalUrl === undefined) delete process.env.RATE_LIMIT_REDIS_URL; else process.env.RATE_LIMIT_REDIS_URL = originalUrl;
  if (originalToken === undefined) delete process.env.RATE_LIMIT_REDIS_TOKEN; else process.env.RATE_LIMIT_REDIS_TOKEN = originalToken;
}

test("distributed limiter uses Redis REST and keeps action keys isolated", async (t) => {
  t.after(restore);
  process.env.RATE_LIMIT_REDIS_URL = "https://redis.example";
  process.env.RATE_LIMIT_REDIS_TOKEN = "secret-not-returned";
  const bodies: string[] = [];
  globalThis.fetch = async (_url, init) => {
    bodies.push(String(init?.body));
    return new Response(JSON.stringify([{ result: 2 }, { result: 1 }, { result: 47 }]), { status: 200 });
  };
  const result = await checkRateLimitDistributed("search:one", 1, 60_000);
  assert.equal(result.allowed, false);
  assert.equal(result.retryAfter, 47);
  assert.match(bodies[0] ?? "", /avg:rate:search:one/);
  assert.doesNotMatch(JSON.stringify(result), /secret-not-returned/);
});

test("distributed limiter falls back locally for missing, invalid, failed, timed-out, or invalid Redis replies", async (t) => {
  t.after(restore);
  delete process.env.RATE_LIMIT_REDIS_URL;
  delete process.env.RATE_LIMIT_REDIS_TOKEN;
  assert.equal((await checkRateLimitDistributed("fallback:missing", 1, 1_000)).allowed, true);
  process.env.RATE_LIMIT_REDIS_URL = "http://invalid";
  process.env.RATE_LIMIT_REDIS_TOKEN = "token";
  assert.equal((await checkRateLimitDistributed("fallback:invalid-url", 1, 1_000)).allowed, true);
  process.env.RATE_LIMIT_REDIS_URL = "https://redis.example";
  delete process.env.RATE_LIMIT_REDIS_TOKEN;
  assert.equal((await checkRateLimitDistributed("fallback:missing-token", 1, 1_000)).allowed, true);
  process.env.RATE_LIMIT_REDIS_TOKEN = "token";
  globalThis.fetch = async () => { throw new Error("timeout"); };
  assert.equal((await checkRateLimitDistributed("fallback:network", 1, 1_000)).allowed, true);
  globalThis.fetch = async () => new Response("not-json", { status: 200 });
  assert.equal((await checkRateLimitDistributed("fallback:invalid-response", 1, 1_000)).allowed, true);
});

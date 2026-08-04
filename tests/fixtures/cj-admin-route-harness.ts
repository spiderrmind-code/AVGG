import assert from "node:assert/strict";
import { mock } from "node:test";

const id = "507f1f77bcf86cd799439011";
let session: { user?: { email?: string; role?: string } } | null = null;
let order: Record<string, unknown> | null = null;
let trusted = true;
let rateAllowed = true;
let createCalls = 0;
class TestObjectId { constructor(readonly value: string) {} static isValid(value: string) { return /^[a-f\d]{24}$/i.test(value); } }
const collection = { findOne: async () => order };

async function main() {
await mock.module("next/server", { namedExports: { NextResponse: { json: (body: unknown, init?: ResponseInit) => Response.json(body, init) } } });
await mock.module("next-auth", { namedExports: { getServerSession: async () => session } });
await mock.module("mongodb", { namedExports: { ObjectId: TestObjectId } });
await mock.module("@/auth", { namedExports: { authOptions: {} } });
await mock.module("@/lib/mongo", { namedExports: { getDb: async () => ({ collection: () => collection }) } });
await mock.module("@/lib/request-security", { namedExports: { hasTrustedOrigin: () => trusted } });
await mock.module("@/lib/request-rate-limit", { namedExports: { checkRateLimit: () => ({ allowed: rateAllowed, retryAfter: 1 }), requestIdentifier: () => "test" } });
await mock.module("@/lib/cj/client", { namedExports: { CjFeatureDisabledError: class extends Error {} } });
await mock.module("@/lib/cj/fulfillment-service", { namedExports: {
  validateCjFulfillment: async () => ({ eligible: true, reasons: [] }),
  executeCjFulfillment: async () => { createCalls++; return { created: true }; },
  syncCjFulfillment: async () => ({ synced: true }), reconcileCjFulfillment: async () => ({ found: true }),
} });
const getRoute = await import("../../app/api/admin/orders/[id]/cj/route");
const actionRoute = await import("../../app/api/admin/orders/[id]/cj/[action]/route");
const admin = { user: { email: "admin@example.test", role: "admin" } };
async function get(orderId = id) { const response = await getRoute.GET(new Request("http://localhost"), { params: Promise.resolve({ id: orderId }) }); return { response, body: await response.json() as Record<string, unknown> }; }
async function post(action: string) { const response = await actionRoute.POST(new Request("http://localhost", { method: "POST", headers: { origin: "http://localhost" }, body: JSON.stringify({ cjOrderId: "untrusted" }) }), { params: Promise.resolve({ id, action }) }); return { response, body: await response.json() as Record<string, unknown> }; }

session = null; order = { _id: id }; assert.equal((await get()).response.status, 401);
session = { user: { email: "user@example.test", role: "user" } }; assert.equal((await get()).response.status, 403);
session = admin; assert.equal((await get("invalid")).response.status, 400);
order = null; assert.equal((await get()).response.status, 404);
order = { _id: id, paymentStatus: "approved", customer: { email: "private@example.test", phone: "123" }, cjOrderId: "cj-1", cjLastError: "safe" }; const sanitized = await get(); assert.equal(sanitized.response.status, 200); assert.equal("customer" in sanitized.body, false); assert.equal(sanitized.body.cjOrderId, "cj-1");
session = null; assert.equal((await post("validate")).response.status, 401);
session = { user: { email: "user@example.test", role: "user" } }; assert.equal((await post("validate")).response.status, 403);
session = admin; trusted = false; assert.equal((await post("validate")).response.status, 403); trusted = true;
rateAllowed = false; assert.equal((await post("validate")).response.status, 429); rateAllowed = true;
order = { _id: id, paymentStatus: "approved" }; assert.equal((await post("validate")).response.status, 200);
process.env.CJ_ORDER_CREATION_ENABLED = "false"; createCalls = 0; const disabled = await post("create"); assert.equal(disabled.response.status, 503); assert.equal(disabled.body.error, "CJ_ORDER_CREATION_DISABLED"); assert.equal(createCalls, 0);
process.env.CJ_ORDER_CREATION_ENABLED = "true"; const created = await post("create"); assert.equal(created.response.status, 200); assert.equal(createCalls, 1, "create ignores the untrusted request body and uses only the route id"); process.env.CJ_ORDER_CREATION_ENABLED = "false";
assert.equal((await post("sync")).response.status, 409); order = { _id: id, supplierOrderId: "supplier-1" }; assert.equal((await post("sync")).response.status, 200);
assert.equal((await post("reconcile")).response.status, 409); order = { _id: id, fulfillmentStatus: "unknown" }; assert.equal((await post("reconcile")).response.status, 200);
assert.equal((await post("unexpected")).response.status, 400);
console.log("CJ admin route mock coverage passed");
}

void main().catch((error: unknown) => { console.error(error); process.exitCode = 1; });

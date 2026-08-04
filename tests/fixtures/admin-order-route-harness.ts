import assert from "node:assert/strict";
import { mock } from "node:test";

type Order = Record<string, unknown>;
type Scenario = {
  session?: { user?: { email?: string; role?: string } } | null;
  first?: Order | null;
  latest?: Order | null;
  matchedCount?: number;
};

const routeKind = process.argv[2];
if (routeKind !== "general" && routeKind !== "individual") throw new Error("Ruta de prueba inv\u00e1lida");

let scenario: Scenario = {};
const writes: Array<{ filter: Record<string, unknown>; update: { $set: Record<string, unknown> } }> = [];
let reads = 0;

class TestObjectId {
  constructor(readonly value: string) {}
  static isValid(value: string) {
    return /^[a-f\d]{24}$/i.test(value);
  }
}

const collection = {
  async findOne() {
    reads += 1;
    return reads === 1 ? scenario.first ?? null : scenario.latest ?? null;
  },
  async updateOne(filter: Record<string, unknown>, update: { $set: Record<string, unknown> }) {
    writes.push({ filter, update });
    return { matchedCount: scenario.matchedCount ?? 1 };
  },
};

async function main() {

await mock.module("next/server", { namedExports: { NextResponse: { json: (body: unknown, init?: ResponseInit) => Response.json(body, init) } } });
await mock.module("next-auth", { namedExports: { getServerSession: async () => scenario.session ?? null } });
await mock.module("mongodb", { namedExports: { ObjectId: TestObjectId } });
await mock.module("@/auth", { namedExports: { authOptions: {} } });
await mock.module("@/lib/mongo", { namedExports: { getDb: async () => ({ collection: () => collection }) } });
await mock.module("@/lib/request-rate-limit", { namedExports: { checkRateLimit: () => ({ allowed: true, retryAfter: 1 }), requestIdentifier: () => "test" } });

const generalRoute = routeKind === "general" ? await import("../../app/api/admin/orders/route") : null;
const individualRoute = routeKind === "individual" ? await import("../../app/api/admin/orders/[id]/route") : null;

const validId = "507f1f77bcf86cd799439011";

async function patch(body: unknown, id = validId) {
  writes.length = 0;
  reads = 0;
  const request = new Request("http://localhost/api/admin/orders", { method: "PATCH", body: JSON.stringify(body), headers: { "content-type": "application/json", origin: "http://localhost:3000" } });
  const response = generalRoute
    ? await generalRoute.PATCH(request)
    : await individualRoute!.PATCH(request, { params: Promise.resolve({ id }) });
  return { response, payload: await response.json() as Record<string, unknown> };
}

function configure(next: Scenario) {
  scenario = next;
  writes.length = 0;
  reads = 0;
}

const admin = { user: { email: "admin@example.test", role: "admin" } };

async function expectStatus(expected: number, body: unknown, options: { id?: string; scenario: Scenario }) {
  configure(options.scenario);
  const result = await patch(body, options.id);
  assert.equal(result.response.status, expected);
  return result;
}

await expectStatus(401, { id: validId, status: "processing" }, { scenario: { session: null } });
await expectStatus(403, { id: validId, status: "processing" }, { scenario: { session: { user: { email: "customer@example.test", role: "customer" } } } });
await expectStatus(400, { id: "invalid", status: "processing" }, { scenario: { session: admin } , ...(routeKind === "individual" ? { id: "invalid" } : {}) });
await expectStatus(400, {}, { scenario: { session: admin } });
await expectStatus(400, { id: validId, status: "not-a-status" }, { scenario: { session: admin } });
await expectStatus(404, { id: validId, status: "processing" }, { scenario: { session: admin, first: null } });

for (const paymentStatus of ["pending", "failed", "refunded", "charged_back"]) {
  await expectStatus(409, { id: validId, status: "processing", paymentStatus: "approved" }, { scenario: { session: admin, first: { status: "pending", paymentStatus } } });
}

for (const [from, to] of [["pending", "processing"], ["processing", "shipped"], ["shipped", "delivered"]]) {
  const result = await expectStatus(200, { id: validId, status: to }, { scenario: { session: admin, first: { status: from, paymentStatus: "approved" } } });
  assert.equal(result.payload.success, true);
  assert.equal(writes.length, 1);
}

for (const [from, to] of [["pending", "shipped"], ["pending", "delivered"], ["processing", "delivered"], ["shipped", "processing"], ["delivered", "shipped"], ["cancelled", "processing"]]) {
  await expectStatus(409, { id: validId, status: to }, { scenario: { session: admin, first: { status: from, paymentStatus: "approved" } } });
  assert.equal(writes.length, 0);
}

configure({ session: admin, first: { status: "processing", paymentStatus: "approved" } });
let result = await patch({ id: validId, status: "processing" });
assert.equal(result.response.status, 200);
assert.equal(result.payload.idempotent, true);
assert.equal(writes.length, 0);
assert.equal(reads, 1);

configure({ session: admin, first: { status: "processing", paymentStatus: "approved" }, latest: { status: "shipped", paymentStatus: "approved" }, matchedCount: 0 });
result = await patch({ id: validId, status: "shipped" });
assert.equal(result.response.status, 200);
assert.equal(result.payload.idempotent, true);
assert.equal(writes.length, 1);
assert.equal(reads, 2);

configure({ session: admin, first: { status: "processing", paymentStatus: "approved" }, latest: { status: "delivered", paymentStatus: "approved" }, matchedCount: 0 });
result = await patch({ id: validId, status: "shipped" });
assert.equal(result.response.status, 409);
assert.equal(result.payload.reason, "concurrent_state_conflict");
assert.equal(writes.length, 1);

configure({ session: admin, first: { status: "processing", paymentStatus: "approved" }, latest: { status: "processing", paymentStatus: "refunded" }, matchedCount: 0 });
result = await patch({ id: validId, status: "shipped" });
assert.equal(result.response.status, 409);
assert.equal(result.payload.reason, "concurrent_payment_conflict");
assert.equal(writes.length, 1);

configure({ session: admin, first: { status: "processing", paymentStatus: "approved" }, latest: null, matchedCount: 0 });
result = await patch({ id: validId, status: "shipped" });
assert.equal(result.response.status, 404);
assert.equal(writes.length, 1);

const protectedFields = {
  paymentStatus: "approved", paymentId: "payment", paidAt: "date", external_reference: "reference", stockApplied: true, stockProcessing: true,
  stockQuantity: 99, items: [{ title: "private" }], total: 999, subtotal: 999, costPrice: 1, userId: "user", customerEmail: "customer@example.test",
  supplierOrderId: "supplier", createdAt: "date", processingAt: "body", shippedAt: "body", deliveredAt: "body", cancelledAt: "body",
};
configure({ session: admin, first: { status: "pending", paymentStatus: "approved", shippedAt: new Date(0) } });
result = await patch({ id: validId, status: "processing", ...protectedFields });
assert.equal(result.response.status, 200);
assert.equal(Object.keys(writes[0].update.$set).every((key) => (routeKind === "individual" ? ["status", "processingAt", "operationalEvents", "updatedAt"] : ["status", "processingAt", "updatedAt"]).includes(key)), true);
if (routeKind === "individual") {
  const events = writes[0].update.$set.operationalEvents;
  assert.ok(Array.isArray(events));
  assert.equal(events.length, 1);
  assert.equal(events[0]?.actor, "a***@example.test");
  assert.equal(events[0]?.summary, "pending → processing");
}

for (const [from, to, timestamp] of [["pending", "processing", "processingAt"], ["processing", "shipped", "shippedAt"], ["shipped", "delivered", "deliveredAt"], ["pending", "cancelled", "cancelledAt"]]) {
  configure({ session: admin, first: { status: from, paymentStatus: to === "cancelled" ? "pending" : "approved", shippedAt: new Date(0) } });
  result = await patch({ id: validId, status: to, processingAt: "untrusted" });
  assert.equal(result.response.status, 200);
  const set = writes[0].update.$set;
  assert.ok(set[timestamp] instanceof Date);
  assert.equal(set.processingAt === "untrusted", false);
  assert.equal(Object.keys(set).every((key) => (routeKind === "individual" ? ["status", timestamp, "operationalEvents", "updatedAt"] : ["status", timestamp, "updatedAt"]).includes(key)), true);
}

  console.log(`${routeKind} route mock coverage passed`);
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});

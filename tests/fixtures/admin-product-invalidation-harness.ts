import assert from "node:assert/strict";
import { mock } from "node:test";

class ObjectId { constructor(readonly value: string) {} static isValid(value: string) { return /^[a-f\d]{24}$/i.test(value); } }
const calls: string[] = [];
async function main() {
  await mock.module("next/server", { namedExports: { NextResponse: { json: (body: unknown, init?: ResponseInit) => Response.json(body, init) } } });
  await mock.module("next-auth", { namedExports: { getServerSession: async () => ({ user: { email: "admin@test", role: "admin" } }) } });
  await mock.module("mongodb", { namedExports: { ObjectId } });
  await mock.module("@/auth", { namedExports: { authOptions: {} } });
  await mock.module("@/lib/product-validation", { namedExports: { validateProductInput: () => ({ name: "P", price: 1, stock: true, active: true }) } });
  await mock.module("@/lib/mongo", { namedExports: { getDb: async () => ({ collection: () => ({ insertOne: async () => ({ insertedId: "id" }), updateOne: async () => ({}), deleteOne: async () => ({}) }) }) } });
  await mock.module("@/lib/public-categories", { namedExports: { invalidatePublicCategories: () => calls.push("categories") } });
  await mock.module("@/lib/public-catalog-cache", { namedExports: { invalidatePublicCatalog: () => calls.push("catalog") } });
  const create = await import("../../app/api/admin/products/route");
  const item = await import("../../app/api/admin/products/[id]/route");
  const request = new Request("http://localhost", { method: "POST", body: "{}" });
  await create.POST(request); assert.deepEqual(calls.splice(0).sort(), ["catalog", "categories"]);
  await item.PATCH(new Request("http://localhost", { method: "PATCH", body: "{}" }), { params: Promise.resolve({ id: "507f1f77bcf86cd799439011" }) }); assert.deepEqual(calls.splice(0).sort(), ["catalog", "categories"]);
  await item.DELETE(new Request("http://localhost", { method: "DELETE" }), { params: Promise.resolve({ id: "507f1f77bcf86cd799439011" }) }); assert.deepEqual(calls.splice(0).sort(), ["catalog", "categories"]);
}
void main().catch((error: unknown) => { console.error(error); process.exitCode = 1; });

import assert from "node:assert/strict";
import test from "node:test";
import { ObjectId } from "mongodb";
import { isPublicPromotion, promotionCanBeActive, promotionStatusForAction, validatePromotionInput } from "../lib/promotions";
import { maintainAutomaticPromotions, promotionTarget } from "../lib/promotions-engine";

const now = new Date("2026-09-22T12:00:00.000Z");
const product = { _id: new ObjectId(), price: 750, comparePrice: 1000, active: true, stock: true, stockQuantity: 3 };

function memoryCollection(initial: Record<string, unknown>[] = []) {
  const documents = [...initial];
  const matches = (document: Record<string, unknown>, query: Record<string, unknown>): boolean => Object.entries(query).every(([key, value]) => {
    if (key === "$or") return (value as Record<string, unknown>[]).some((item) => matches(document, item));
    if (key === "$expr") return Number(document.comparePrice) > Number(document.price);
    const actual = document[key];
    if (value && typeof value === "object") {
      const condition = value as Record<string, unknown>;
      if ("$ne" in condition) return actual !== condition.$ne;
      if ("$in" in condition) return (condition.$in as unknown[]).includes(actual);
      if ("$nin" in condition) return !(condition.$nin as unknown[]).some((item) => String(item) === String(actual));
      if ("$lte" in condition) return new Date(String(actual)).getTime() <= new Date(String(condition.$lte)).getTime();
      if ("$gt" in condition) return Number(actual) > Number(condition.$gt);
      if ("$exists" in condition) return condition.$exists ? actual !== undefined : actual === undefined;
    }
    return String(actual) === String(value);
  });
  const collection = {
    documents,
    createIndex: async () => "index",
    updateMany: async (query: Record<string, unknown>, update: { $set: Record<string, unknown> }) => { let modifiedCount = 0; for (const document of documents) if (matches(document, query)) { Object.assign(document, update.$set); modifiedCount += 1; } return { modifiedCount }; },
    find: (query: Record<string, unknown> = {}) => { const result = documents.filter((document) => matches(document, query)); return { sort: () => ({ limit: (count: number) => ({ toArray: async () => result.slice(0, count) }), toArray: async () => result }), toArray: async () => result }; },
    countDocuments: async (query: Record<string, unknown>) => documents.filter((document) => matches(document, query)).length,
    insertOne: async (document: Record<string, unknown>) => { if (documents.some((item) => String(item.productId) === String(document.productId) && ["active", "scheduled"].includes(String(item.status)))) { const error = Object.assign(new Error("duplicate"), { code: 11000 }); throw error; } documents.push(document); return { insertedId: document._id ?? new ObjectId() }; },
  };
  return collection as never;
}

test("promotion uses the real product price and calculates the discount", () => {
  const promotion = validatePromotionInput({ productId: product._id, promotionalPrice: 600, type: "percentage", startsAt: "2026-09-22T00:00:00.000Z", endsAt: "2026-09-30T00:00:00.000Z" }, product, now);
  assert.equal(promotion?.basePrice, 750);
  assert.equal(promotion?.discountPercent, 20);
  assert.equal(promotion?.status, "active");
});

test("promotion cannot be active without valid real stock or price", () => {
  const invalid = validatePromotionInput({ productId: product._id, basePrice: product.comparePrice, promotionalPrice: product.price, type: "fixed", startsAt: "2026-09-22T00:00:00.000Z", endsAt: "2026-09-30T00:00:00.000Z" }, { ...product, stockQuantity: 0 }, now);
  assert.equal(invalid?.status, "draft");
  assert.equal(promotionCanBeActive({ ...product, stockQuantity: 0 }, invalid ?? { basePrice: 1000, promotionalPrice: 750, startsAt: now, endsAt: new Date("2026-09-30T00:00:00.000Z") }, now), false);
  assert.equal(validatePromotionInput({ productId: product._id, promotionalPrice: 500, type: "fixed", startsAt: now, endsAt: new Date("2026-09-30T00:00:00.000Z") }, { ...product, price: 0 }, now), null);
});

test("public promotion requires active status and current dates", () => {
  assert.equal(isPublicPromotion({ status: "active", startsAt: new Date("2026-09-22T00:00:00.000Z"), endsAt: new Date("2026-09-30T00:00:00.000Z") }, now), true);
  assert.equal(isPublicPromotion({ status: "scheduled", startsAt: now, endsAt: new Date("2026-09-30T00:00:00.000Z") }, now), false);
});

test("promotion target is configurable without accepting invalid values", () => {
  assert.equal(promotionTarget({ NODE_ENV: "test", PROMOTIONS_TARGET_ACTIVE: "14" }), 14);
  assert.equal(promotionTarget({ NODE_ENV: "test", PROMOTIONS_TARGET_ACTIVE: "0" }), 20);
});

test("automatic maintenance creates one real promotion and is idempotent", async () => {
  const products = memoryCollection([product]);
  const promotions = memoryCollection();
  const first = await maintainAutomaticPromotions(products, promotions, now, { NODE_ENV: "test", PROMOTIONS_TARGET_ACTIVE: "1" });
  const second = await maintainAutomaticPromotions(products, promotions, now, { NODE_ENV: "test", PROMOTIONS_TARGET_ACTIVE: "1" });
  assert.equal(first.created, 1);
  assert.equal(second.created, 0);
  assert.equal(second.activeAfter, 1);
});

test("automatic maintenance expires and replaces a valid expired promotion", async () => {
  const products = memoryCollection([product]);
  const promotions = memoryCollection([{ _id: new ObjectId(), productId: product._id, basePrice: 1000, promotionalPrice: 750, discountPercent: 25, type: "fixed", startsAt: new Date("2026-09-01T00:00:00.000Z"), endsAt: new Date("2026-09-22T11:00:00.000Z"), status: "active" }]);
  const result = await maintainAutomaticPromotions(products, promotions, now, { NODE_ENV: "test", PROMOTIONS_TARGET_ACTIVE: "1" });
  assert.equal(result.expired, 1);
  assert.equal(result.created, 1);
});

test("automatic maintenance leaves the target empty when no products are eligible", async () => {
  const result = await maintainAutomaticPromotions(memoryCollection([{ ...product, stockQuantity: 0 }]), memoryCollection(), now, { NODE_ENV: "test", PROMOTIONS_TARGET_ACTIVE: "20" });
  assert.equal(result.created, 0);
  assert.equal(result.activeAfter, 0);
});

test("promotion actions map to controlled lifecycle states", () => {
  assert.equal(promotionStatusForAction("activate"), "active");
  assert.equal(promotionStatusForAction("pause"), "paused");
  assert.equal(promotionStatusForAction("cancel"), "cancelled");
});
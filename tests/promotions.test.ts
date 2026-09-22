import assert from "node:assert/strict";
import test from "node:test";
import { ObjectId } from "mongodb";
import { isPublicPromotion, promotionCanBeActive, validatePromotionInput } from "../lib/promotions";

const now = new Date("2026-09-22T12:00:00.000Z");
const product = { _id: new ObjectId(), price: 1000, active: true, stock: true, stockQuantity: 3 };

test("promotion uses the real product price and calculates the discount", () => {
  const promotion = validatePromotionInput({ productId: product._id, promotionalPrice: 750, type: "percentage", startsAt: "2026-09-22T00:00:00.000Z", endsAt: "2026-09-30T00:00:00.000Z" }, product, now);
  assert.equal(promotion?.basePrice, 1000);
  assert.equal(promotion?.discountPercent, 25);
  assert.equal(promotion?.status, "active");
});

test("promotion cannot be active without valid real stock or price", () => {
  const invalid = validatePromotionInput({ productId: product._id, promotionalPrice: 750, type: "fixed", startsAt: "2026-09-22T00:00:00.000Z", endsAt: "2026-09-30T00:00:00.000Z" }, { ...product, stockQuantity: 0 }, now);
  assert.equal(invalid?.status, "draft");
  assert.equal(promotionCanBeActive({ ...product, stockQuantity: 0 }, invalid ?? { basePrice: 1000, promotionalPrice: 750, startsAt: now, endsAt: new Date("2026-09-30T00:00:00.000Z") }, now), false);
});

test("public promotion requires active status and current dates", () => {
  assert.equal(isPublicPromotion({ status: "active", startsAt: new Date("2026-09-22T00:00:00.000Z"), endsAt: new Date("2026-09-30T00:00:00.000Z") }, now), true);
  assert.equal(isPublicPromotion({ status: "scheduled", startsAt: now, endsAt: new Date("2026-09-30T00:00:00.000Z") }, now), false);
});
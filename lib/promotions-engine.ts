import type { Collection, Document, ObjectId } from "mongodb";
import { validatePromotionInput, promotionCanBeActive, type PromotionProduct } from "@/lib/promotions";

const ACTIVE_STATUSES = ["active", "scheduled"];
const DEFAULT_TARGET = 20;
const DEFAULT_DURATION_HOURS = 24;

export type PromotionMaintenanceResult = {
  target: number;
  activeBefore: number;
  expired: number;
  invalidated: number;
  created: number;
  activeAfter: number;
  eligible: number;
};

export function promotionTarget(env: NodeJS.ProcessEnv = process.env) {
  const value = Number(env.PROMOTIONS_TARGET_ACTIVE);
  return Number.isInteger(value) && value > 0 ? Math.min(value, 100) : DEFAULT_TARGET;
}

function durationHours(env: NodeJS.ProcessEnv = process.env) {
  const value = Number(env.PROMOTIONS_DURATION_HOURS);
  return Number.isFinite(value) && value > 0 ? Math.min(value, 720) : DEFAULT_DURATION_HOURS;
}

export async function ensurePromotionIndexes(promotions: Collection<Document>) {
  await promotions.createIndex({ productId: 1 }, { unique: true, partialFilterExpression: { status: { $in: ACTIVE_STATUSES } }, name: "one_open_promotion_per_product" });
  await promotions.createIndex({ status: 1, startsAt: 1, endsAt: 1 }, { name: "promotion_rotation_window" });
}

export async function maintainAutomaticPromotions(products: Collection<Document>, promotions: Collection<Document>, now = new Date(), env: NodeJS.ProcessEnv = process.env): Promise<PromotionMaintenanceResult> {
  const target = promotionTarget(env);
  await ensurePromotionIndexes(promotions);

  const expiredResult = await promotions.updateMany({ status: { $in: ACTIVE_STATUSES }, endsAt: { $lte: now } }, { $set: { status: "expired", updatedAt: now } });
  const openPromotions = await promotions.find({ status: { $in: ACTIVE_STATUSES } }).toArray();
  const productIds = openPromotions.map((promotion) => promotion.productId).filter(Boolean);
  const currentProducts = productIds.length ? await products.find({ _id: { $in: productIds } }).toArray() : [];
  const productById = new Map(currentProducts.map((product) => [String(product._id), product]));
  let invalidated = 0;
  for (const promotion of openPromotions) {
    const product = productById.get(String(promotion.productId));
    if (!product || !promotionCanBeActive(product as PromotionProduct, promotion as never, now)) {
      const result = await promotions.updateOne({ _id: promotion._id, status: { $in: ACTIVE_STATUSES } }, { $set: { status: "draft", updatedAt: now } });
      invalidated += result.modifiedCount;
    }
  }

  const validOpen = await promotions.countDocuments({ status: "active", startsAt: { $lte: now }, endsAt: { $gt: now } });
  const openIds = (await promotions.find({ status: { $in: ACTIVE_STATUSES } }, { projection: { productId: 1 } }).toArray()).map((promotion) => promotion.productId);
  const eligibleProducts = await products.find({ _id: { $nin: openIds }, active: { $ne: false }, price: { $gt: 0 }, comparePrice: { $gt: 0 }, $expr: { $gt: ["$comparePrice", "$price"] }, $or: [{ stockQuantity: { $gt: 0 } }, { stockQuantity: { $exists: false }, stock: true }] }).sort({ updatedAt: -1, createdAt: -1 }).toArray();
  let created = 0;
  const slots = Math.max(0, target - validOpen);
  const endsAt = new Date(now.getTime() + durationHours(env) * 60 * 60 * 1000);
  for (const product of eligibleProducts.slice(0, slots)) {
    const promotion = validatePromotionInput({ productId: product._id as ObjectId, basePrice: product.comparePrice, promotionalPrice: product.price, type: "fixed", startsAt: now, endsAt }, product as PromotionProduct, now);
    if (!promotion || promotion.status !== "active") continue;
    try {
      await promotions.insertOne({ ...promotion, createdAt: now, updatedAt: now });
      created += 1;
    } catch (error) {
      if (!(error && typeof error === "object" && "code" in error && error.code === 11000)) throw error;
    }
  }

  return { target, activeBefore: openPromotions.length, expired: expiredResult.modifiedCount, invalidated, created, activeAfter: await promotions.countDocuments({ status: "active", startsAt: { $lte: now }, endsAt: { $gt: now } }), eligible: eligibleProducts.length };
}
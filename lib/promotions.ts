import { ObjectId } from "mongodb";
import type { PromotionStatus, PromotionType } from "@/models/Promotion";

export type PromotionProduct = {
  _id: ObjectId | string;
  price: unknown;
  comparePrice?: unknown;
  active?: unknown;
  stock?: unknown;
  stockQuantity?: unknown;
};

export type PromotionInput = {
  productId: unknown;
  basePrice?: unknown;
  promotionalPrice: unknown;
  type: unknown;
  startsAt: unknown;
  endsAt: unknown;
  status?: unknown;
};

export type ValidatedPromotion = {
  productId: ObjectId;
  basePrice: number;
  promotionalPrice: number;
  discountPercent: number;
  type: PromotionType;
  startsAt: Date;
  endsAt: Date;
  status: PromotionStatus;
};

function positiveNumber(value: unknown) {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function productHasStock(product: PromotionProduct) {
  if (product.active === false || product.stock === false) return false;
  if (typeof product.stockQuantity === "number") return product.stockQuantity > 0;
  return product.stock === true;
}

export function promotionCanBeActive(product: PromotionProduct, promotion: Pick<ValidatedPromotion, "basePrice" | "promotionalPrice" | "startsAt" | "endsAt">, now = new Date()) {
  return productHasStock(product)
    && (positiveNumber(product.price) === promotion.basePrice || (positiveNumber(product.comparePrice) === promotion.basePrice && promotion.basePrice > (positiveNumber(product.price) ?? 0)))
    && promotion.promotionalPrice > 0
    && promotion.promotionalPrice < promotion.basePrice
    && promotion.startsAt <= now
    && promotion.endsAt > now;
}

export function validatePromotionInput(input: PromotionInput, product: PromotionProduct, now = new Date()): ValidatedPromotion | null {
  const productId = typeof input.productId === "string" && ObjectId.isValid(input.productId) ? new ObjectId(input.productId) : input.productId instanceof ObjectId ? input.productId : null;
  const currentPrice = positiveNumber(product.price);
  const requestedBasePrice = input.basePrice === undefined ? currentPrice : positiveNumber(input.basePrice);
  const basePrice = requestedBasePrice !== null && (requestedBasePrice === currentPrice || requestedBasePrice === positiveNumber(product.comparePrice)) ? requestedBasePrice : null;
  const promotionalPrice = positiveNumber(input.promotionalPrice);
  const startsAt = new Date(String(input.startsAt ?? ""));
  const endsAt = new Date(String(input.endsAt ?? ""));
  const type = input.type === "percentage" || input.type === "fixed" ? input.type : null;
  if (!productId || basePrice === null || promotionalPrice === null || !type || Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime()) || endsAt <= startsAt || promotionalPrice >= basePrice) return null;

  const discountPercent = Math.round(((basePrice - promotionalPrice) / basePrice) * 10000) / 100;
  if (discountPercent <= 0 || discountPercent >= 100) return null;

  const requestedStatus = input.status === "draft" || input.status === "paused" ? input.status : null;
  const status: PromotionStatus = requestedStatus ?? (endsAt <= now ? "expired" : startsAt > now ? "scheduled" : promotionCanBeActive(product, { basePrice, promotionalPrice, startsAt, endsAt }, now) ? "active" : "draft");
  return { productId, basePrice, promotionalPrice, discountPercent, type, startsAt, endsAt, status };
}

export function isPublicPromotion(promotion: Pick<ValidatedPromotion, "status" | "startsAt" | "endsAt">, now = new Date()) {
  return promotion.status === "active" && promotion.startsAt <= now && promotion.endsAt > now;
}
import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongo";
import { isPublicPromotion, promotionCanBeActive, type PromotionProduct } from "@/lib/promotions";

export async function GET(request: Request) {
  try {
    const limitValue = Number(new URL(request.url).searchParams.get("limit"));
    const limit = Number.isInteger(limitValue) && limitValue > 0 ? Math.min(limitValue, 100) : 50;
    const now = new Date();
    const db = await getDb();
    const promotions = await db.collection("promotions").aggregate([
      { $match: { status: "active", startsAt: { $lte: now }, endsAt: { $gt: now } } },
      { $sort: { createdAt: -1 } },
      { $limit: limit },
      { $lookup: { from: "products", localField: "productId", foreignField: "_id", as: "product" } },
      { $unwind: "$product" },
      { $match: { "product.active": { $ne: false }, "product.price": { $gt: 0 }, $expr: { $eq: ["$basePrice", "$product.price"] }, $or: [{ "product.stockQuantity": { $gt: 0 } }, { "product.stockQuantity": { $exists: false }, "product.stock": true }] } },
      { $project: { _id: 1, productId: 1, basePrice: 1, promotionalPrice: 1, discountPercent: 1, type: 1, startsAt: 1, endsAt: 1, status: 1, product: 1 } },
    ]).toArray();
    return NextResponse.json({ success: true, promotions: promotions.filter((promotion) => isPublicPromotion(promotion as { status: "active"; startsAt: Date; endsAt: Date }) && promotionCanBeActive(promotion.product as PromotionProduct, promotion as { basePrice: number; promotionalPrice: number; startsAt: Date; endsAt: Date })) }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("ERROR PUBLIC PROMOTIONS:", error);
    return NextResponse.json({ success: false, message: "No se pudieron cargar las promociones" }, { status: 503 });
  }
}
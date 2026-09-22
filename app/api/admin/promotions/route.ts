import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { ObjectId } from "mongodb";
import { authOptions } from "@/auth";
import { getDb } from "@/lib/mongo";
import { validatePromotionInput } from "@/lib/promotions";

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  return session?.user?.email && session.user.role === "admin" ? null : NextResponse.json({ success: false, message: "No autorizado" }, { status: 401 });
}

export async function GET() {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;
  try {
    const db = await getDb();
    const promotions = await db.collection("promotions").aggregate([
      { $sort: { createdAt: -1 } },
      { $lookup: { from: "products", localField: "productId", foreignField: "_id", as: "product" } },
      { $unwind: { path: "$product", preserveNullAndEmptyArrays: true } },
      { $project: { productId: 1, basePrice: 1, promotionalPrice: 1, discountPercent: 1, type: 1, startsAt: 1, endsAt: 1, status: 1, createdAt: 1, updatedAt: 1, product: { _id: 1, name: 1, title: 1, price: 1, stock: 1, stockQuantity: 1, active: 1 } } },
    ]).toArray();
    return NextResponse.json({ success: true, promotions });
  } catch (error) {
    console.error("ERROR ADMIN PROMOTIONS:", error);
    return NextResponse.json({ success: false, message: "Error cargando promociones" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;
  try {
    const body: unknown = await request.json();
    const candidate = body && typeof body === "object" ? body as Record<string, unknown> : null;
    const productId = typeof candidate?.productId === "string" && ObjectId.isValid(candidate.productId) ? new ObjectId(candidate.productId) : null;
    if (!productId) return NextResponse.json({ success: false, message: "Producto inválido" }, { status: 400 });
    const db = await getDb();
    const product = await db.collection("products").findOne({ _id: productId });
    if (!product) return NextResponse.json({ success: false, message: "Producto no encontrado" }, { status: 404 });
    const promotion = validatePromotionInput({ productId, promotionalPrice: candidate?.promotionalPrice, type: candidate?.type, startsAt: candidate?.startsAt, endsAt: candidate?.endsAt, status: candidate?.status }, product as { _id: ObjectId; price: unknown; active?: unknown; stock?: unknown; stockQuantity?: unknown });
    if (!promotion) return NextResponse.json({ success: false, message: "Promoción inválida para el precio o stock actual" }, { status: 400 });
    const now = new Date();
    const result = await db.collection("promotions").insertOne({ ...promotion, createdAt: now, updatedAt: now });
    return NextResponse.json({ success: true, promotion: { _id: result.insertedId, ...promotion } }, { status: 201 });
  } catch (error) {
    console.error("ERROR CREATE PROMOTION:", error);
    return NextResponse.json({ success: false, message: "Error creando promoción" }, { status: 500 });
  }
}
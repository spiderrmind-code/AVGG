import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { ObjectId } from "mongodb";
import { authOptions } from "@/auth";
import { getDb } from "@/lib/mongo";
import { promotionStatusForAction, validatePromotionInput } from "@/lib/promotions";
import { ensurePromotionIndexes } from "@/lib/promotions-engine";

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  return session?.user?.email && session.user.role === "admin" ? null : NextResponse.json({ success: false, message: "No autorizado" }, { status: 401 });
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;
  const { id } = await context.params;
  if (!ObjectId.isValid(id)) return NextResponse.json({ success: false, message: "Promoción inválida" }, { status: 400 });
  try {
    const body: unknown = await request.json();
    const candidate = body && typeof body === "object" ? body as Record<string, unknown> : {};
    const db = await getDb();
    const promotions = db.collection("promotions");
    await ensurePromotionIndexes(promotions);
    const promotion = await promotions.findOne({ _id: new ObjectId(id) });
    if (!promotion) return NextResponse.json({ success: false, message: "Promoción no encontrada" }, { status: 404 });
    const now = new Date();
    const action = candidate.action;
    if (action === "pause" || action === "cancel") {
      if (action === "pause" && !["active", "scheduled"].includes(String(promotion.status))) return NextResponse.json({ success: false, message: "Solo se pueden pausar promociones abiertas" }, { status: 409 });
      if (action === "cancel" && ["expired", "cancelled"].includes(String(promotion.status))) return NextResponse.json({ success: false, message: "La promoción ya está cerrada" }, { status: 409 });
      const status = promotionStatusForAction(action);
      await promotions.updateOne({ _id: promotion._id }, { $set: { status, updatedAt: now } });
      return NextResponse.json({ success: true, status });
    }
    const product = await db.collection("products").findOne({ _id: promotion.productId });
    if (!product) return NextResponse.json({ success: false, message: "Producto no encontrado" }, { status: 404 });
    const validation = validatePromotionInput({ productId: promotion.productId, basePrice: candidate.basePrice ?? promotion.basePrice, promotionalPrice: candidate.promotionalPrice ?? promotion.promotionalPrice, type: candidate.type ?? promotion.type, kind: candidate.kind ?? promotion.kind, startsAt: candidate.startsAt ?? promotion.startsAt, endsAt: candidate.endsAt ?? promotion.endsAt }, product as { _id: ObjectId; price: unknown; comparePrice?: unknown; active?: unknown; stock?: unknown; stockQuantity?: unknown }, now);
    if (!validation) return NextResponse.json({ success: false, message: "Promoción inválida para el precio o stock actual" }, { status: 400 });
    if (action === "activate" && !["draft", "paused", "scheduled"].includes(String(promotion.status))) return NextResponse.json({ success: false, message: "La promoción no puede reactivarse desde este estado" }, { status: 409 });
    if (action === "activate" && validation.status !== "active") return NextResponse.json({ success: false, message: "La promoción no puede activarse con los datos actuales" }, { status: 400 });
    if (validation.status === "active") {
      const conflict = await promotions.findOne({ productId: promotion.productId, status: { $in: ["active", "scheduled"] }, _id: { $ne: promotion._id } });
      if (conflict) return NextResponse.json({ success: false, message: "El producto ya tiene otra promoción abierta" }, { status: 409 });
    }
    await promotions.updateOne({ _id: promotion._id }, { $set: { ...validation, updatedAt: now } });
    return NextResponse.json({ success: true, promotion: { _id: promotion._id, ...validation } });
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === 11000) return NextResponse.json({ success: false, message: "El producto ya tiene una promoción abierta" }, { status: 409 });
    console.error("ERROR UPDATE PROMOTION:", error);
    return NextResponse.json({ success: false, message: "Error actualizando promoción" }, { status: 500 });
  }
}
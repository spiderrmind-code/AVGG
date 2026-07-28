import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { ObjectId } from "mongodb";
import { authOptions } from "@/auth";
import { getDb } from "@/lib/mongo";
import { validateProductInput } from "@/lib/product-validation";

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email || session.user.role !== "admin") {
    return NextResponse.json({ success: false, message: "No autorizado" }, { status: 401 });
  }
  return null;
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  try {
    const { id } = await context.params;
    if (!ObjectId.isValid(id)) return NextResponse.json({ success: false, message: "Producto inválido" }, { status: 400 });
    const body: unknown = await request.json();
    const candidate = body && typeof body === "object" ? body as Record<string, unknown> : null;
    const product = candidate ? validateProductInput(candidate) : null;
    if (!product) return NextResponse.json({ success: false, message: "Producto inválido" }, { status: 400 });
    const db = await getDb();

    await db.collection("products").updateOne({ _id: new ObjectId(id) }, { $set: { ...product, updatedAt: new Date() } });
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === 11000) return NextResponse.json({ success: false, message: "SKU o slug ya existente" }, { status: 409 });
    console.error("Product update failed", { errorType: error instanceof Error ? error.name : "unknown" });
    return NextResponse.json({ success: false, message: "Error actualizando producto" }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  try {
    const { id } = await context.params;
    if (!ObjectId.isValid(id)) return NextResponse.json({ success: false, message: "Producto inválido" }, { status: 400 });
    const db = await getDb();
    await db.collection("products").deleteOne({ _id: new ObjectId(id) });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("ERROR DELETE PRODUCT:", error);
    return NextResponse.json({ success: false, message: "Error eliminando producto" }, { status: 500 });
  }
}

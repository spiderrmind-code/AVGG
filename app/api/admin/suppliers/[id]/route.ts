import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { ObjectId } from "mongodb";
import { authOptions } from "@/auth";
import { getDb } from "@/lib/mongo";
import type { SupplierDocument } from "@/types/ecommerce";

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email || session.user.role !== "admin") {
    return NextResponse.json({ success: false, message: "No autorizado" }, { status: 401 });
  }
  return null;
}

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  try {
    const { id } = await context.params;
    const db = await getDb();
    const supplier = await db.collection<SupplierDocument>("suppliers").findOne({ _id: new ObjectId(id) });

    if (!supplier) {
      return NextResponse.json({ success: false, message: "Proveedor no encontrado" }, { status: 404 });
    }

    return NextResponse.json({ success: true, supplier });
  } catch (error) {
    console.error("ERROR GET SUPPLIER:", error);
    return NextResponse.json({ success: false, message: "No se pudo cargar proveedor" }, { status: 500 });
  }
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  try {
    const { id } = await context.params;
    const body = await request.json();
    const db = await getDb();

    await db.collection<SupplierDocument>("suppliers").updateOne({ _id: new ObjectId(id) }, { $set: { ...body, updatedAt: new Date() } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("ERROR UPDATE SUPPLIER:", error);
    return NextResponse.json({ success: false, message: "No se pudo actualizar proveedor" }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  try {
    const { id } = await context.params;
    const db = await getDb();
    await db.collection<SupplierDocument>("suppliers").deleteOne({ _id: new ObjectId(id) });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("ERROR DELETE SUPPLIER:", error);
    return NextResponse.json({ success: false, message: "No se pudo eliminar proveedor" }, { status: 500 });
  }
}

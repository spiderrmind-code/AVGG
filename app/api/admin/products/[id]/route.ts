import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { ObjectId } from "mongodb";
import { authOptions } from "@/auth";
import { getDb } from "@/lib/mongo";

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email || (session.user as any).role !== "admin") {
    return NextResponse.json({ success: false, message: "No autorizado" }, { status: 401 });
  }
  return null;
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  try {
    const { id } = await context.params;
    const body = await request.json();
    const db = await getDb();

    await db.collection("products").updateOne({ _id: new ObjectId(id) }, { $set: { ...body, updatedAt: new Date() } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("ERROR UPDATE PRODUCT:", error);
    return NextResponse.json({ success: false, message: "Error actualizando producto" }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  try {
    const { id } = await context.params;
    const db = await getDb();
    await db.collection("products").deleteOne({ _id: new ObjectId(id) });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("ERROR DELETE PRODUCT:", error);
    return NextResponse.json({ success: false, message: "Error eliminando producto" }, { status: 500 });
  }
}

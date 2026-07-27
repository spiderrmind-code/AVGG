import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { getDb } from "@/lib/mongo";

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email || (session.user as any).role !== "admin") {
    return NextResponse.json({ success: false, message: "No autorizado" }, { status: 401 });
  }
  return null;
}

export async function GET() {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  try {
    const db = await getDb();
    const orders = await db.collection("orders").find({}).sort({ createdAt: -1 }).toArray();
    return NextResponse.json({ success: true, orders });
  } catch (error) {
    console.error("ERROR ADMIN OPERATIONS:", error);
    return NextResponse.json({ success: false, message: "Error cargando operaciones" }, { status: 500 });
  }
}

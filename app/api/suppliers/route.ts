import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { getDb } from "@/lib/mongo";
import { authOptions } from "@/auth";

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email || (session.user as any).role !== "admin") {
    return NextResponse.json({ success: false, message: "No autorizado" }, { status: 401 });
  }
  return null;
}

export async function GET() {
  try {
    const db = await getDb();
    const suppliers = await db.collection("suppliers").find({}).sort({ name: 1 }).toArray();
    return NextResponse.json({ success: true, suppliers });
  } catch (error) {
    console.error("ERROR GET SUPPLIERS:", error);
    return NextResponse.json({ success: false, message: "No se pudieron cargar proveedores" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  try {
    const body = await request.json();
    const db = await getDb();
    const result = await db.collection("suppliers").insertOne({
      ...body,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return NextResponse.json({ success: true, insertedId: result.insertedId });
  } catch (error) {
    console.error("ERROR CREATE SUPPLIER:", error);
    return NextResponse.json({ success: false, message: "No se pudo crear proveedor" }, { status: 500 });
  }
}

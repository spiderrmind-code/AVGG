import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
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

export async function GET() {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  try {
    const db = await getDb();
    const suppliers = await db.collection<SupplierDocument>("suppliers").find({}).sort({ name: 1 }).toArray();
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
    const result = await db.collection<SupplierDocument>("suppliers").insertOne({
      ...body,
      status: body.status ?? "active",
      type: body.type ?? "manual",
      externalId: body.externalId ?? null,
      apiUrl: body.apiUrl ?? null,
      syncStatus: body.syncStatus ?? "idle",
      lastSync: body.lastSync ?? null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return NextResponse.json({ success: true, insertedId: result.insertedId });
  } catch (error) {
    console.error("ERROR CREATE SUPPLIER:", error);
    return NextResponse.json({ success: false, message: "No se pudo crear proveedor" }, { status: 500 });
  }
}

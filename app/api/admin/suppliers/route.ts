import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { getDb } from "@/lib/mongo";
import { encryptSupplierCredentials, parseSupplierInput, publicSupplierProjection } from "@/lib/supplier-security";
import { logServerError } from "@/lib/logger";
import type { SupplierDocument } from "@/types/ecommerce";

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ success: false, error: { code: "UNAUTHENTICATED", message: "No autenticado" } }, { status: 401 });
  if (session.user.role !== "admin") return NextResponse.json({ success: false, error: { code: "UNAUTHORIZED", message: "No autorizado" } }, { status: 403 });
  return null;
}

export async function GET() {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;
  try {
    const db = await getDb();
    const suppliers = await db.collection<SupplierDocument>("suppliers").find({}, { projection: publicSupplierProjection() }).sort({ name: 1 }).toArray();
    return NextResponse.json({ success: true, suppliers });
  } catch (error) {
    logServerError("admin.suppliers.list_failed", { errorType: error instanceof Error ? error.name : "unknown" });
    return NextResponse.json({ success: false, error: { code: "SUPPLIERS_UNAVAILABLE", message: "No se pudieron cargar proveedores" } }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;
  try {
    const body: unknown = await request.json();
    const supplier = parseSupplierInput(body);
    if (!supplier) return NextResponse.json({ success: false, error: { code: "INVALID_SUPPLIER", message: "Proveedor inválido" } }, { status: 400 });
    const { credentials, ...fields } = supplier;
    const db = await getDb();
    const now = new Date();
    const result = await db.collection<SupplierDocument>("suppliers").insertOne({
      ...fields,
      ...(credentials ? { credentialsEncrypted: encryptSupplierCredentials(credentials) } : {}),
      syncStatus: "idle",
      lastSync: null,
      createdAt: now,
      updatedAt: now,
    });
    return NextResponse.json({ success: true, insertedId: result.insertedId });
  } catch (error) {
    logServerError("admin.suppliers.create_failed", { errorType: error instanceof Error ? error.name : "unknown" });
    return NextResponse.json({ success: false, error: { code: "SUPPLIER_CREATE_FAILED", message: "No se pudo crear proveedor" } }, { status: 500 });
  }
}

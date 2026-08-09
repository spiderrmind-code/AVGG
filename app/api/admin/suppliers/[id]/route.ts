import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { ObjectId } from "mongodb";
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

async function supplierId(context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  return ObjectId.isValid(id) ? new ObjectId(id) : null;
}

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;
  const id = await supplierId(context);
  if (!id) return NextResponse.json({ success: false, error: { code: "INVALID_SUPPLIER_ID", message: "Proveedor inválido" } }, { status: 400 });
  try {
    const supplier = await (await getDb()).collection<SupplierDocument>("suppliers").findOne({ _id: id }, { projection: publicSupplierProjection() });
    if (!supplier) return NextResponse.json({ success: false, error: { code: "SUPPLIER_NOT_FOUND", message: "Proveedor no encontrado" } }, { status: 404 });
    return NextResponse.json({ success: true, supplier });
  } catch (error) {
    logServerError("admin.suppliers.read_failed", { errorType: error instanceof Error ? error.name : "unknown" });
    return NextResponse.json({ success: false, error: { code: "SUPPLIER_UNAVAILABLE", message: "No se pudo cargar proveedor" } }, { status: 500 });
  }
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;
  const id = await supplierId(context);
  if (!id) return NextResponse.json({ success: false, error: { code: "INVALID_SUPPLIER_ID", message: "Proveedor inválido" } }, { status: 400 });
  try {
    const supplier = parseSupplierInput(await request.json(), { partial: true });
    if (!supplier || Object.keys(supplier).length === 0) return NextResponse.json({ success: false, error: { code: "INVALID_SUPPLIER", message: "Proveedor inválido" } }, { status: 400 });
    const { credentials, ...fields } = supplier;
    const update = {
      ...fields,
      ...(credentials ? { credentialsEncrypted: encryptSupplierCredentials(credentials) } : {}),
      updatedAt: new Date(),
    };
    const result = await (await getDb()).collection<SupplierDocument>("suppliers").updateOne({ _id: id }, { $set: update });
    if (!result.matchedCount) return NextResponse.json({ success: false, error: { code: "SUPPLIER_NOT_FOUND", message: "Proveedor no encontrado" } }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (error) {
    logServerError("admin.suppliers.update_failed", { errorType: error instanceof Error ? error.name : "unknown" });
    return NextResponse.json({ success: false, error: { code: "SUPPLIER_UPDATE_FAILED", message: "No se pudo actualizar proveedor" } }, { status: 500 });
  }
}

export async function DELETE(_: Request, context: { params: Promise<{ id: string }> }) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;
  const id = await supplierId(context);
  if (!id) return NextResponse.json({ success: false, error: { code: "INVALID_SUPPLIER_ID", message: "Proveedor inválido" } }, { status: 400 });
  try {
    const result = await (await getDb()).collection<SupplierDocument>("suppliers").deleteOne({ _id: id });
    if (!result.deletedCount) return NextResponse.json({ success: false, error: { code: "SUPPLIER_NOT_FOUND", message: "Proveedor no encontrado" } }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (error) {
    logServerError("admin.suppliers.delete_failed", { errorType: error instanceof Error ? error.name : "unknown" });
    return NextResponse.json({ success: false, error: { code: "SUPPLIER_DELETE_FAILED", message: "No se pudo eliminar proveedor" } }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { getDb } from "@/lib/mongo";
import type { Document, Filter } from "mongodb";
import { authOptions } from "@/auth";
import { validateProductInput } from "@/lib/product-validation";

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email || session.user.role !== "admin") {
    return NextResponse.json({ success: false, message: "No autorizado" }, { status: 401 });
  }
  return null;
}

function escapeRegex(value: string) { return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }

export async function GET(request: Request) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  try {
    const params = new URL(request.url).searchParams;
    const pageValue = Number(params.get("page")); const page = Number.isInteger(pageValue) && pageValue > 0 ? Math.min(pageValue, 10_000) : 1;
    const limit = Math.min(Math.max(Number(params.get("limit")) || 25, 1), 100);
    const filter: Filter<Document> = {};
    const category = params.get("category")?.trim(); const supplier = params.get("supplier")?.trim(); const active = params.get("active"); const stock = params.get("stock"); const q = params.get("q")?.trim();
    if (category) filter.category = category;
    if (supplier) filter.supplier = supplier;
    if (active === "true" || active === "false") filter.active = active === "true";
    if (stock === "in") filter.stock = true;
    if (stock === "out") filter.$or = [{ stock: false }, { stockQuantity: { $lte: 0 } }, { supplierStock: { $lte: 0 } }];
    if (q) filter.$and = [{ ...(filter.$and ? { $and: filter.$and } : {}) }, { $or: [{ name: { $regex: escapeRegex(q), $options: "i" } }, { title: { $regex: escapeRegex(q), $options: "i" } }, { sku: { $regex: escapeRegex(q), $options: "i" } }] }];
    const db = await getDb();
    const products = await db.collection("products").find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).toArray();
    const total = await db.collection("products").countDocuments(filter);
    return NextResponse.json({ success: true, products, pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) } });
  } catch (error) {
    console.error("ERROR ADMIN PRODUCTS:", error);
    return NextResponse.json({ success: false, message: "Error cargando productos" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  try {
    const body: unknown = await request.json();
    const candidate = body && typeof body === "object" ? body as Record<string, unknown> : null;
    const product = candidate ? validateProductInput(candidate, { generatedSku: `SKU-${Date.now()}` }) : null;
    if (!product) return NextResponse.json({ success: false, message: "Producto inválido" }, { status: 400 });
    const db = await getDb();
    const result = await db.collection("products").insertOne({
      ...product,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return NextResponse.json({ success: true, insertedId: result.insertedId });
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === 11000) return NextResponse.json({ success: false, message: "SKU o slug ya existente" }, { status: 409 });
    console.error("Product creation failed", { errorType: error instanceof Error ? error.name : "unknown" });
    return NextResponse.json({ success: false, message: "Error creando producto" }, { status: 500 });
  }
}

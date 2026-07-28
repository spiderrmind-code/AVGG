import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { getDb } from "@/lib/mongo";
import { authOptions } from "@/auth";
import { validateProductInput } from "@/lib/product-validation";

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
    const products = await db.collection("products").find({}).sort({ createdAt: -1 }).toArray();
    return NextResponse.json({ success: true, products });
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

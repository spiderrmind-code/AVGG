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

export async function POST(request: Request) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  try {
    const body: unknown = await request.json();
    const record = body && typeof body === "object" ? body as Record<string, unknown> : null;
    const payload = Array.isArray(body) ? body : record?.products;

    if (!Array.isArray(payload)) {
      return NextResponse.json({ success: false, message: "Formato inválido. Enviá un array de productos o { products: [...] }" }, { status: 400 });
    }

    const db = await getDb();
    const now = new Date();

    const prepared = payload.map((item, index) => {
      const candidate = item && typeof item === "object" ? item as Record<string, unknown> : null;
      const product = candidate ? validateProductInput(candidate, { generatedSku: `SKU-${Date.now()}-${index}` }) : null;
      return product ? { ...product, createdAt: now, updatedAt: now } : null;
    });
    if (prepared.some((product) => product === null)) return NextResponse.json({ success: false, message: "Uno o más productos son inválidos" }, { status: 400 });
    const validPrepared = prepared.filter((product): product is NonNullable<typeof product> => product !== null);

    const result = await db.collection("products").insertMany(validPrepared);

    return NextResponse.json({ success: true, insertedCount: result.insertedCount });
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === 11000) return NextResponse.json({ success: false, message: "SKU o slug duplicado" }, { status: 409 });
    console.error("Product import failed", { errorType: error instanceof Error ? error.name : "unknown" });
    return NextResponse.json({ success: false, message: "No se pudieron importar los productos" }, { status: 500 });
  }
}

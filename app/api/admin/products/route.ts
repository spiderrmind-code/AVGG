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
    const body = await request.json();
    const db = await getDb();
    const result = await db.collection("products").insertOne({
      ...body,
      title: body.title ?? body.name,
      shortDescription: body.shortDescription ?? body.description,
      benefits: body.benefits ?? [],
      features: body.features ?? [],
      faq: body.faq ?? [],
      slug: body.slug ?? body.name?.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""),
      createdAt: new Date(),
      updatedAt: new Date(),
      stock: body.stock ?? true,
      active: body.active ?? true,
      featured: body.featured ?? false,
      supplier: body.supplier ?? body.supplierName ?? "Local",
      supplierId: body.supplierId ?? null,
      supplierName: body.supplierName ?? body.supplier ?? "Local",
      supplierSku: body.supplierSku ?? null,
      supplierProductId: body.supplierProductId ?? null,
      supplierCost: body.supplierCost ?? body.costPrice ?? body.price,
      supplierStock: body.supplierStock ?? body.stock ?? 0,
      supplierShippingTime: body.supplierShippingTime ?? body.shippingDays ?? "24-48 hs",
      supplierLink: body.supplierLink ?? "",
      costPrice: body.costPrice ?? body.price,
      margin: body.margin ?? 0,
      sku: body.sku ?? `SKU-${Date.now()}`,
      shippingDays: body.shippingDays ?? "24-48 hs",
      shippingInfo: body.shippingInfo ?? "Envío coordinado con seguimiento.",
      offer: body.offer ?? null,
    });

    return NextResponse.json({ success: true, insertedId: result.insertedId });
  } catch (error) {
    console.error("ERROR CREATE PRODUCT:", error);
    return NextResponse.json({ success: false, message: "Error creando producto" }, { status: 500 });
  }
}

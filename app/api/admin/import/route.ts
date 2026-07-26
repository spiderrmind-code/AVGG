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

function toSlug(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export async function POST(request: Request) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  try {
    const body = await request.json();
    const payload = Array.isArray(body) ? body : body.products;

    if (!Array.isArray(payload)) {
      return NextResponse.json({ success: false, message: "Formato inválido. Enviá un array de productos o { products: [...] }" }, { status: 400 });
    }

    const db = await getDb();
    const now = new Date();

    const prepared = payload.map((item: any) => ({
      name: item.name ?? item.title ?? "Producto",
      title: item.title ?? item.name ?? "Producto",
      shortDescription: item.shortDescription ?? item.description ?? "Producto seleccionado para la tienda.",
      description: item.description ?? item.shortDescription ?? "Producto preparado para vender.",
      benefits: Array.isArray(item.benefits) ? item.benefits : [],
      features: Array.isArray(item.features) ? item.features : [],
      faq: Array.isArray(item.faq) ? item.faq : [],
      price: Number(item.price ?? 0),
      comparePrice: item.comparePrice ? Number(item.comparePrice) : undefined,
      costPrice: item.costPrice ? Number(item.costPrice) : undefined,
      margin: item.margin ? Number(item.margin) : 0,
      image: item.image ?? item.images?.[0] ?? undefined,
      images: Array.isArray(item.images) ? item.images : [],
      category: item.category ?? "Tecnología",
      slug: item.slug ?? toSlug(item.name ?? item.title ?? "producto"),
      supplier: item.supplier ?? "Local",
      supplierId: item.supplierId ?? "local",
      supplierLink: item.supplierLink ?? "",
      shippingDays: item.shippingDays ?? "24-48 hs",
      shippingInfo: item.shippingInfo ?? "Envío coordinado con seguimiento.",
      stock: item.stock ?? true,
      active: item.active ?? true,
      featured: item.featured ?? false,
      sku: item.sku ?? `SKU-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      createdAt: now,
      updatedAt: now,
    }));

    const result = await db.collection("products").insertMany(prepared);

    return NextResponse.json({ success: true, insertedCount: result.insertedCount });
  } catch (error) {
    console.error("ERROR IMPORT PRODUCTS:", error);
    return NextResponse.json({ success: false, message: "No se pudieron importar los productos" }, { status: 500 });
  }
}

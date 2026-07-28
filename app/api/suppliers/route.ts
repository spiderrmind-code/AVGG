import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { getDb } from "@/lib/mongo";
import { authOptions } from "@/auth";

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
    const suppliers = await db.collection("suppliers").find({}).sort({ name: 1 }).toArray();
    const safeSuppliers = suppliers.map((supplier) => ({
      _id: String(supplier._id),
      name: typeof supplier.name === "string" ? supplier.name : "Proveedor",
      status: typeof supplier.status === "string" ? supplier.status : "active",
      type: typeof supplier.type === "string" ? supplier.type : undefined,
      country: typeof supplier.country === "string" ? supplier.country : undefined,
      city: typeof supplier.city === "string" ? supplier.city : undefined,
      contact: typeof supplier.contact === "string" ? supplier.contact : undefined,
      email: typeof supplier.email === "string" ? supplier.email : undefined,
    }));
    return NextResponse.json({ success: true, suppliers: safeSuppliers });
  } catch (error) {
    console.error("ERROR GET SUPPLIERS:", error);
    return NextResponse.json({ success: false, message: "No se pudieron cargar proveedores" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  try {
    const body: unknown = await request.json();
    const candidate = body && typeof body === "object" ? body as Record<string, unknown> : null;
    const name = typeof candidate?.name === "string" ? candidate.name.trim() : "";
    if (!name || name.length > 120) return NextResponse.json({ success: false, message: "Proveedor inválido" }, { status: 400 });
    const db = await getDb();
    const result = await db.collection("suppliers").insertOne({
      name,
      description: typeof candidate?.description === "string" ? candidate.description.trim().slice(0, 1000) : "",
      country: typeof candidate?.country === "string" ? candidate.country.trim().slice(0, 80) : "",
      city: typeof candidate?.city === "string" ? candidate.city.trim().slice(0, 80) : "",
      contact: typeof candidate?.contact === "string" ? candidate.contact.trim().slice(0, 160) : "",
      email: typeof candidate?.email === "string" ? candidate.email.trim().toLowerCase().slice(0, 254) : "",
      phone: typeof candidate?.phone === "string" ? candidate.phone.trim().slice(0, 40) : "",
      website: typeof candidate?.website === "string" ? candidate.website.trim().slice(0, 500) : "",
      logo: typeof candidate?.logo === "string" ? candidate.logo.trim().slice(0, 500) : "",
      status: candidate?.status === "paused" ? "paused" : "active",
      type: typeof candidate?.type === "string" ? candidate.type.trim().slice(0, 80) : "other",
      externalId: typeof candidate?.externalId === "string" ? candidate.externalId.trim().slice(0, 160) : "",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return NextResponse.json({ success: true, insertedId: result.insertedId });
  } catch (error) {
    console.error("ERROR CREATE SUPPLIER:", error);
    return NextResponse.json({ success: false, message: "No se pudo crear proveedor" }, { status: 500 });
  }
}

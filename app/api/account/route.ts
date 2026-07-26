import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { getDb } from "@/lib/mongo";

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    return NextResponse.json({ success: false, message: "No autenticado" }, { status: 401 });
  }

  const db = await getDb();
  const user = await db.collection("users").findOne({ email: session.user.email });

  if (!user) {
    return NextResponse.json({ success: false, message: "Usuario no encontrado" }, { status: 404 });
  }

  return NextResponse.json({
    success: true,
    user: {
      id: user._id.toString(),
      name: user.name ?? "",
      lastName: user.lastName ?? "",
      email: user.email,
      phone: user.phone ?? "",
      address: user.address ?? "",
      city: user.city ?? "",
      province: user.province ?? "",
      postalCode: user.postalCode ?? "",
      image: user.image ?? null,
      role: user.role,
      status: user.status ?? "active",
    },
  });
}

export async function PATCH(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    return NextResponse.json({ success: false, message: "No autenticado" }, { status: 401 });
  }

  const body = await request.json();
  const update: Record<string, unknown> = { updatedAt: new Date() };

  if (typeof body.name === "string") update.name = body.name.trim();
  if (typeof body.phone === "string") update.phone = body.phone.trim();
  if (typeof body.address === "string") update.address = body.address.trim();
  if (typeof body.city === "string") update.city = body.city.trim();
  if (typeof body.province === "string") update.province = body.province.trim();
  if (typeof body.postalCode === "string") update.postalCode = body.postalCode.trim();

  const db = await getDb();
  await db.collection("users").updateOne({ email: session.user.email }, { $set: update });

  return NextResponse.json({ success: true, message: "Datos actualizados" });
}
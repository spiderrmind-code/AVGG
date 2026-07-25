import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getDb } from "@/lib/mongo";
import { ObjectId } from "mongodb";

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    return NextResponse.json(
      { success: false, message: "No autenticado" },
      { status: 401 }
    );
  }

  const db = await getDb();
  const user = await db
    .collection("users")
    .findOne({ email: session.user.email });

  if (!user) {
    return NextResponse.json(
      { success: false, message: "Usuario no encontrado" },
      { status: 404 }
    );
  }

  return NextResponse.json({
    success: true,
    user: {
      id: user._id.toString(),
      name: user.name ?? "",
      email: user.email,
      image: user.image ?? null,
      role: user.role,
    },
  });
}

export async function PATCH(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    return NextResponse.json(
      { success: false, message: "No autenticado" },
      { status: 401 }
    );
  }

  const body = await request.json();
  const { name } = body;

  if (typeof name !== "string" || name.trim().length === 0) {
    return NextResponse.json(
      { success: false, message: "Nombre inválido" },
      { status: 400 }
    );
  }

  const db = await getDb();
  await db
    .collection("users")
    .updateOne(
      { email: session.user.email },
      { $set: { name: name.trim() } }
    );

  return NextResponse.json({ success: true, message: "Datos actualizados" });
}
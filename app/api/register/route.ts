import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getDb } from "@/lib/mongo";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { success: false, message: "Email y contraseña son obligatorios" },
        { status: 400 }
      );
    }

    if (typeof email !== "string" || typeof password !== "string") {
      return NextResponse.json(
        { success: false, message: "Formato de datos inválido" },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { success: false, message: "La contraseña debe tener al menos 6 caracteres" },
        { status: 400 }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();

    const db = await getDb();
    const users = db.collection("users");

    const existingUser = await users.findOne({ email: normalizedEmail });
    if (existingUser) {
      return NextResponse.json(
        { success: false, message: "El usuario ya existe" },
        { status: 409 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await users.insertOne({
      email: normalizedEmail,
      password: hashedPassword,
      role: "customer",
      createdAt: new Date(),
    });

    return NextResponse.json(
      {
        success: true,
        message: "Usuario creado correctamente",
        userId: result.insertedId,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error /api/register:", error);
    return NextResponse.json(
      { success: false, message: "Error al registrar usuario" },
      { status: 500 }
    );
  }
}
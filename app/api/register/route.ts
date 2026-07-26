import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getDb } from "@/lib/mongo";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, lastName, email, phone, password } = body;

    if (!email || !password || !name || !lastName) {
      return NextResponse.json({ success: false, message: "Nombre, apellido, email y contraseña son obligatorios" }, { status: 400 });
    }

    if (typeof email !== "string" || typeof password !== "string") {
      return NextResponse.json({ success: false, message: "Formato de datos inválido" }, { status: 400 });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ success: false, message: "El email no es válido" }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json({ success: false, message: "La contraseña debe tener al menos 8 caracteres" }, { status: 400 });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const db = await getDb();
    const users = db.collection("users");

    const existingUser = await users.findOne({ email: normalizedEmail });
    if (existingUser) {
      return NextResponse.json({ success: false, message: "El usuario ya existe" }, { status: 409 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await users.insertOne({
      name: name.trim(),
      lastName: lastName.trim(),
      email: normalizedEmail,
      phone: phone?.trim() ?? "",
      password: hashedPassword,
      role: "customer",
      status: "active",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastLoginAt: null,
    });

    return NextResponse.json({ success: true, message: "Usuario creado correctamente", userId: result.insertedId }, { status: 201 });
  } catch (error) {
    console.error("Error /api/register:", error);
    return NextResponse.json({ success: false, message: "Error al registrar usuario" }, { status: 500 });
  }
}
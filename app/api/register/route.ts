import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getDb } from "@/lib/mongo";
import { validateRegisterInput } from "@/lib/auth-validation";
import { checkRateLimit, requestIdentifier } from "@/lib/request-rate-limit";
import { hasJsonContentType, hasTrustedOrigin } from "@/lib/request-security";

export async function POST(request: Request) {
  if (!hasTrustedOrigin(request)) return NextResponse.json({ success: false, message: "Origen no permitido" }, { status: 403 });
  if (!hasJsonContentType(request)) return NextResponse.json({ success: false, message: "Content-Type inválido" }, { status: 415 });
  const limit = checkRateLimit(`register:${requestIdentifier(request)}`, 5, 15 * 60 * 1000);
  if (!limit.allowed) return NextResponse.json({ success: false, message: "Demasiadas solicitudes" }, { status: 429, headers: { "Retry-After": String(limit.retryAfter) } });
  try {
    const body = await request.json();
    const { name, lastName, email, phone, password, confirmPassword } = body;

    const validation = validateRegisterInput({ name, lastName, email, password, confirmPassword });
    if (!validation.valid) {
      return NextResponse.json({ success: false, message: validation.errors[0] }, { status: 400 });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const normalizedName = String(name).trim();
    const normalizedLastName = String(lastName).trim();
    const normalizedPassword = String(password);
    const normalizedPhone = typeof phone === "string" ? phone.trim() : "";
    const db = await getDb();
    const users = db.collection("users");

    const existingUser = await users.findOne({ email: normalizedEmail });
    if (existingUser) {
      return NextResponse.json({ success: false, message: "El usuario ya existe" }, { status: 409 });
    }

    const hashedPassword = await bcrypt.hash(normalizedPassword, 10);

    const result = await users.insertOne({
      name: normalizedName,
      lastName: normalizedLastName,
      email: normalizedEmail,
      phone: normalizedPhone,
      password: hashedPassword,
      role: "customer",
      status: "active",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastLoginAt: null,
    });

    return NextResponse.json({ success: true, message: "Usuario creado correctamente", userId: result.insertedId }, { status: 201 });
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === 11000) {
      return NextResponse.json({ success: false, message: "El usuario ya existe" }, { status: 409 });
    }
    console.error("Registration failed", { errorType: error instanceof Error ? error.name : "unknown" });
    return NextResponse.json({ success: false, message: "Error al registrar usuario" }, { status: 500 });
  }
}

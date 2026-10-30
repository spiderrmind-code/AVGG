import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { validateRegisterInput, validateStudioRegisterInput } from "@/lib/auth-validation";
import { checkRateLimitDistributed, requestIdentifier } from "@/lib/request-rate-limit";
import { hasJsonContentType, hasTrustedOrigin } from "@/lib/request-security";
import { getStudioDb } from "@/lib/studio-mongo";
import { isStudioAccountRegistrationEnabled, isStudioDeployment } from "@/lib/studio-routes";
import { checkAppointmentRateLimit, isValidAppointmentPhone, studioPrivacyNoticeVersion } from "@/lib/appointments";
import { requireAuthSecret } from "@/lib/auth-secret";

async function registerStudioCustomer(request: Request) {
  if (!isStudioAccountRegistrationEnabled()) {
    return NextResponse.json({ success: false, message: "El registro de cuentas está pausado mientras se finalizan las verificaciones de privacidad." }, { status: 503 });
  }
  const db = await getStudioDb();
  const limit = await checkAppointmentRateLimit(db, `register:${requestIdentifier(request)}`, requireAuthSecret(), 5, 15 * 60 * 1000);
  if (!limit.allowed) return NextResponse.json({ success: false, message: "Demasiadas solicitudes. Intentá nuevamente más tarde." }, { status: 429, headers: { "Retry-After": String(limit.retryAfter) } });

  const rawBody = await request.text();
  if (rawBody.length > 16_000) return NextResponse.json({ success: false, message: "La solicitud supera el tamaño permitido." }, { status: 413 });
  let body: Record<string, unknown>;
  try {
    body = JSON.parse(rawBody) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ success: false, message: "El formato de la solicitud no es válido." }, { status: 400 });
  }
  if (typeof body.website === "string" && body.website.trim()) {
    return NextResponse.json({ success: false, message: "No se pudo completar el registro." }, { status: 400 });
  }
  const { name, lastName, email, phone, password, confirmPassword } = body;
  const validation = validateStudioRegisterInput({
    name: typeof name === "string" ? name : undefined,
    lastName: typeof lastName === "string" ? lastName : undefined,
    email: typeof email === "string" ? email : undefined,
    password: typeof password === "string" ? password : undefined,
    confirmPassword: typeof confirmPassword === "string" ? confirmPassword : undefined,
  });
  if (!validation.valid) return NextResponse.json({ success: false, message: validation.errors[0] }, { status: 400 });
  if (body.privacyConsent !== true) return NextResponse.json({ success: false, message: "Debés aceptar la política de privacidad." }, { status: 400 });

  const normalizedEmail = String(email).trim().toLowerCase();
  const normalizedName = String(name).trim();
  const normalizedLastName = String(lastName).trim();
  const normalizedPhone = typeof phone === "string" ? phone.trim() : "";
  if (normalizedName.length > 80 || normalizedLastName.length > 80 || (normalizedPhone && !isValidAppointmentPhone(normalizedPhone))) {
    return NextResponse.json({ success: false, message: "Revisá los datos ingresados." }, { status: 400 });
  }
  if (normalizedEmail === process.env.STUDIO_ADMIN_EMAIL?.trim().toLowerCase()) {
    return NextResponse.json({ success: false, message: "No se puede registrar esta cuenta desde el formulario público." }, { status: 409 });
  }
  const users = db.collection("users");
  if (await users.findOne({ email: normalizedEmail }, { projection: { _id: 1 } })) {
    return NextResponse.json({ success: false, message: "El usuario ya existe." }, { status: 409 });
  }
  const now = new Date();
  await users.insertOne({
    name: `${normalizedName} ${normalizedLastName}`,
    lastName: normalizedLastName,
    email: normalizedEmail,
    phone: normalizedPhone,
    password: await bcrypt.hash(String(password), 12),
    role: "customer",
    status: "active",
    provider: "credentials",
    emailVerified: false,
    privacyAcceptedAt: now,
    privacyNoticeVersion: studioPrivacyNoticeVersion,
    createdAt: now,
    updatedAt: now,
    lastLoginAt: null,
  });
  return NextResponse.json({ success: true, message: "Cuenta creada. Iniciá sesión para continuar." }, { status: 201 });
}

export async function POST(request: Request) {
  if (!hasTrustedOrigin(request)) return NextResponse.json({ success: false, message: "Origen no permitido" }, { status: 403 });
  if (!hasJsonContentType(request)) return NextResponse.json({ success: false, message: "Content-Type inválido" }, { status: 415 });
  if (isStudioDeployment()) {
    try {
      return await registerStudioCustomer(request);
    } catch (error) {
      if (error && typeof error === "object" && "code" in error && error.code === 11000) {
        return NextResponse.json({ success: false, message: "El usuario ya existe." }, { status: 409 });
      }
      console.error("Studio registration failed", { errorType: error instanceof Error ? error.name : "unknown" });
      return NextResponse.json({ success: false, message: "No se pudo crear la cuenta." }, { status: 500 });
    }
  }
  const limit = await checkRateLimitDistributed(`register:${requestIdentifier(request)}`, 5, 15 * 60 * 1000);
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
    const { getDb } = await import("@/lib/mongo");
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

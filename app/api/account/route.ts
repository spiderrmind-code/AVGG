import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { ObjectId } from "mongodb";
import { authOptions } from "@/auth";
import { hasJsonContentType, hasTrustedOrigin } from "@/lib/request-security";
import { logServerError } from "@/lib/logger";
import { getStudioDb } from "@/lib/studio-mongo";
import { isStudioAccountRegistrationEnabled, isStudioDeployment, resolveStudioDeployment } from "@/lib/studio-routes";
import { isValidAppointmentPhone } from "@/lib/appointments";

async function getAccountDatabase() {
  const deployment = resolveStudioDeployment();
  if (deployment.enabled) {
    if (!deployment.consistent) throw new Error("Studio deployment is not consistently enabled");
    return getStudioDb();
  }
  const { getDb } = await import("@/lib/mongo");
  return getDb();
}

export async function GET() {
  const deployment = resolveStudioDeployment();
  if (deployment.enabled && !deployment.consistent) {
    return NextResponse.json({ success: false, message: "La cuenta no está disponible por configuración." }, { status: 503 });
  }
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    return NextResponse.json({ success: false, message: "No autenticado" }, { status: 401 });
  }
  if (deployment.enabled && session.user.role !== "customer") {
    return NextResponse.json({ success: false, message: "No autorizado" }, { status: 403 });
  }

  const db = await getAccountDatabase();
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
      ...(!deployment.enabled ? {
        address: user.address ?? "",
        city: user.city ?? "",
        province: user.province ?? "",
        postalCode: user.postalCode ?? "",
      } : {}),
      image: user.image ?? null,
      role: user.role,
      status: user.status ?? "active",
    },
  });
}

export async function PATCH(request: Request) {
  if (resolveStudioDeployment().enabled && !isStudioAccountRegistrationEnabled()) {
    return NextResponse.json({ success: false, message: "La actualización de cuentas está pausada mientras se finalizan las verificaciones de privacidad." }, { status: 503 });
  }
  if (!hasTrustedOrigin(request)) return NextResponse.json({ success: false, message: "Origen no permitido" }, { status: 403 });
  if (!hasJsonContentType(request)) return NextResponse.json({ success: false, message: "Content-Type inválido" }, { status: 415 });
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    return NextResponse.json({ success: false, message: "No autenticado" }, { status: 401 });
  }
  if (resolveStudioDeployment().enabled && session.user.role !== "customer") {
    return NextResponse.json({ success: false, message: "No autorizado" }, { status: 403 });
  }

  const rawBody = await request.text();
  if (rawBody.length > 8_000) return NextResponse.json({ success: false, message: "La solicitud supera el tamaño permitido." }, { status: 413 });
  let body: Record<string, unknown>;
  try {
    body = JSON.parse(rawBody) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ success: false, message: "El formato de la solicitud no es válido." }, { status: 400 });
  }
  if (body.name !== undefined && (typeof body.name !== "string" || !body.name.trim() || body.name.trim().length > 120)) {
    return NextResponse.json({ success: false, message: "El nombre ingresado no es válido." }, { status: 400 });
  }
  if (body.phone !== undefined && (typeof body.phone !== "string" || body.phone.trim().length > 40 || (body.phone.trim() !== "" && !isValidAppointmentPhone(body.phone)))) {
    return NextResponse.json({ success: false, message: "El teléfono ingresado no es válido." }, { status: 400 });
  }
  const update: Record<string, unknown> = { updatedAt: new Date() };

  const deployment = resolveStudioDeployment();
  if (typeof body.name === "string" && body.name.trim().length <= 120) update.name = body.name.trim();
  if (typeof body.phone === "string" && body.phone.trim().length <= 40) update.phone = body.phone.trim();
  if (!deployment.enabled) {
    if (typeof body.address === "string") update.address = body.address.trim();
    if (typeof body.city === "string") update.city = body.city.trim();
    if (typeof body.province === "string") update.province = body.province.trim();
    if (typeof body.postalCode === "string") update.postalCode = body.postalCode.trim();
  }

  const db = await getAccountDatabase();
  const result = await db.collection("users").updateOne({ email: session.user.email }, { $set: update });
  if (!result.matchedCount) return NextResponse.json({ success: false, message: "Usuario no encontrado." }, { status: 404 });

  return NextResponse.json({ success: true, message: "Datos actualizados" });
}

export async function DELETE(request: Request) {
  if (!isStudioDeployment()) return NextResponse.json({ success: false, message: "No encontrado." }, { status: 404 });
  if (!hasTrustedOrigin(request)) return NextResponse.json({ success: false, message: "Origen no permitido." }, { status: 403 });

  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !session.user.email || session.user.role !== "customer") {
    return NextResponse.json({ success: false, message: "No autenticado." }, { status: 401 });
  }
  if (!ObjectId.isValid(session.user.id)) {
    return NextResponse.json({ success: false, message: "La cuenta no es válida." }, { status: 400 });
  }

  try {
    const db = await getStudioDb();
    const userId = new ObjectId(session.user.id);
    const user = await db.collection("users").findOne({
      _id: userId,
      email: session.user.email,
      role: "customer",
    }, { projection: { _id: 1 } });
    if (!user) return NextResponse.json({ success: false, message: "Cuenta no encontrada." }, { status: 404 });

    await db.collection("appointments").updateMany(
      { userId: session.user.id },
      {
        $unset: {
          userId: "",
          name: "",
          email: "",
          phone: "",
          idea: "",
          fingerprint: "",
        },
        $set: { anonymizedAt: new Date() },
      },
    );
    const deleted = await db.collection("users").deleteOne({
      _id: userId,
      email: session.user.email,
      role: "customer",
    });
    if (!deleted.deletedCount) {
      return NextResponse.json({ success: false, message: "No se pudo completar la eliminación. Contactá al estudio." }, { status: 409 });
    }

    return NextResponse.json({ success: true, message: "Cuenta eliminada y datos personales de turnos anonimizados." }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    logServerError("studio_customer_account_delete_failed", { errorType: error instanceof Error ? error.name : "unknown" });
    return NextResponse.json({ success: false, message: "No se pudo completar la eliminación. Contactá al estudio." }, { status: 500, headers: { "Cache-Control": "no-store" } });
  }
}

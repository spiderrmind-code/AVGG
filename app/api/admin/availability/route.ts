import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/auth";
import { requireAuthSecret } from "@/lib/auth-secret";
import { checkAppointmentRateLimit, studioPrivacyNoticeVersion } from "@/lib/appointments";
import { getStudioDb, isStudioMongoConfigured } from "@/lib/studio-mongo";
import { hasJsonContentType, hasTrustedOrigin } from "@/lib/request-security";
import { requestIdentifier } from "@/lib/request-rate-limit";
import { isAuthorizedStudioAdmin, resolveStudioDeployment } from "@/lib/studio-routes";
import { defaultStudioAvailability, validateStudioAvailability, type StudioAvailabilitySettings } from "@/lib/studio-availability";
import { logServerError } from "@/lib/logger";

async function authorize() {
  const deployment = resolveStudioDeployment();
  if (!deployment.enabled) return NextResponse.json({ message: "No encontrado" }, { status: 404 });
  if (!deployment.consistent) return NextResponse.json({ message: "La administración no está configurada." }, { status: 503 });
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ message: "No autenticado" }, { status: 401 });
  if (!isAuthorizedStudioAdmin(session.user.email, session.user.role)) return NextResponse.json({ message: "No autorizado" }, { status: 403 });
  if (!isStudioMongoConfigured()) return NextResponse.json({ message: "La base de Studio no está configurada." }, { status: 503 });
  return null;
}

async function rateLimit(request: Request) {
  const db = await getStudioDb();
  return checkAppointmentRateLimit(db, `admin-availability:${requestIdentifier(request)}`, requireAuthSecret(), 60, 10 * 60 * 1000);
}

export async function GET(request: Request) {
  const denied = await authorize();
  if (denied) return denied;
  try {
    const limit = await rateLimit(request);
    if (!limit.allowed) return NextResponse.json({ message: "Demasiadas solicitudes." }, { status: 429, headers: { "Retry-After": String(limit.retryAfter) } });
    const db = await getStudioDb();
    const stored = await db.collection<StudioAvailabilitySettings & { _id: string }>("studio_settings").findOne({ _id: "availability" });
    const validated = stored ? validateStudioAvailability(stored) : { valid: true as const, settings: defaultStudioAvailability };
    if (!validated.valid) return NextResponse.json({ message: "La configuración guardada es inválida y requiere revisión." }, { status: 500 });
    return NextResponse.json({ settings: validated.settings }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    logServerError("studio_availability_read_failed", { errorType: error instanceof Error ? error.name : "unknown" });
    return NextResponse.json({ message: "No se pudo cargar la disponibilidad." }, { status: 500, headers: { "Cache-Control": "no-store" } });
  }
}

export async function PUT(request: Request) {
  const denied = await authorize();
  if (denied) return denied;
  if (!hasTrustedOrigin(request) || !hasJsonContentType(request)) return NextResponse.json({ message: "Solicitud inválida." }, { status: 400 });
  try {
    const limit = await rateLimit(request);
    if (!limit.allowed) return NextResponse.json({ message: "Demasiadas solicitudes." }, { status: 429, headers: { "Retry-After": String(limit.retryAfter) } });
    const rawBody = await request.text();
    if (rawBody.length > 20_000) return NextResponse.json({ message: "La configuración supera el tamaño permitido." }, { status: 413 });
    let body: unknown;
    try {
      body = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ message: "El formato de la configuración no es válido." }, { status: 400 });
    }
    const validation = validateStudioAvailability(body);
    if (!validation.valid) return NextResponse.json({ message: validation.message }, { status: 400 });
    const db = await getStudioDb();
    const appointmentPolicies = [
      { statuses: ["requested", "rejected"], days: validation.settings.retention.unconfirmedDays, anchor: "lastInteractionAt", fallback: "createdAt" },
      { statuses: ["cancelled"], days: validation.settings.retention.cancelledDays, anchor: "cancelledAt", fallback: "updatedAt" },
      { statuses: ["completed"], days: validation.settings.retention.completedDays, anchor: "completedAt", fallback: "updatedAt" },
    ];
    const appointments = db.collection("appointments");
    for (const policy of appointmentPolicies) {
      const filter = { privacyNoticeVersion: studioPrivacyNoticeVersion, status: { $in: policy.statuses } };
      if (policy.days === null) {
        await appointments.updateMany(filter, { $unset: { expiresAt: "" } });
      } else {
        const anchorDate = { $ifNull: [`$${policy.anchor}`, { $ifNull: [`$${policy.fallback}`, "$createdAt"] }] };
        await appointments.updateMany(filter, [{
          $set: { expiresAt: { $add: [anchorDate, policy.days * 24 * 60 * 60 * 1000] } },
        }]);
      }
    }
    await db.collection<StudioAvailabilitySettings & { _id: string }>("studio_settings").updateOne(
      { _id: "availability" },
      { $set: { ...validation.settings, updatedAt: new Date() } },
      { upsert: true },
    );
    return NextResponse.json({ success: true, settings: validation.settings }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    logServerError("studio_availability_save_failed", { errorType: error instanceof Error ? error.name : "unknown" });
    return NextResponse.json({ message: "No se pudo guardar la disponibilidad." }, { status: 500 });
  }
}

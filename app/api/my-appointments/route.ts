import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { ObjectId } from "mongodb";
import { authOptions } from "@/auth";
import { checkAppointmentRateLimit } from "@/lib/appointments";
import { requireAuthSecret } from "@/lib/auth-secret";
import { logServerError } from "@/lib/logger";
import { getStudioDb } from "@/lib/studio-mongo";
import { hasJsonContentType, hasTrustedOrigin } from "@/lib/request-security";
import { requestIdentifier } from "@/lib/request-rate-limit";
import { resolveStudioDeployment } from "@/lib/studio-routes";
import { defaultStudioAvailability, getStudioAppointmentSlotLockIds, getStudioRetentionExpiry, validateStudioAvailability, type StudioAvailabilitySettings } from "@/lib/studio-availability";

async function getCustomerSession() {
  const deployment = resolveStudioDeployment();
  if (!deployment.enabled || !deployment.consistent) return { response: NextResponse.json({ message: "No encontrado" }, { status: 404 }) };
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !session.user.email) {
    return { response: NextResponse.json({ message: "No autenticado" }, { status: 401 }) };
  }
  if (session.user.role !== "customer") {
    return { response: NextResponse.json({ message: "No autorizado" }, { status: 403 }) };
  }
  return { session };
}

export async function GET(request: Request) {
  const auth = await getCustomerSession();
  if ("response" in auth) return auth.response;
  try {
    const db = await getStudioDb();
    const limit = await checkAppointmentRateLimit(
      db,
      `customer-appointments:${auth.session.user.id}:${requestIdentifier(request)}`,
      requireAuthSecret(),
      60,
      10 * 60 * 1000,
    );
    if (!limit.allowed) return NextResponse.json({ message: "Demasiadas solicitudes." }, { status: 429, headers: { "Retry-After": String(limit.retryAfter), "Cache-Control": "no-store" } });
    const appointments = await db.collection("appointments")
      .find({ userId: auth.session.user.id }, { projection: { style: 1, idea: 1, preferredDate: 1, preferredTime: 1, status: 1 } })
      .sort({ preferredDate: 1, preferredTime: 1, createdAt: -1 })
      .limit(100)
      .toArray();
    return NextResponse.json({ appointments }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    logServerError("studio_customer_appointments_list_failed", { errorType: error instanceof Error ? error.name : "unknown" });
    return NextResponse.json({ message: "No se pudieron cargar tus turnos." }, { status: 500, headers: { "Cache-Control": "no-store" } });
  }
}

export async function PATCH(request: Request) {
  const auth = await getCustomerSession();
  if ("response" in auth) return auth.response;
  if (!hasTrustedOrigin(request) || !hasJsonContentType(request)) {
    return NextResponse.json({ message: "Solicitud inválida" }, { status: 400 });
  }
  try {
    const raw = await request.text();
    if (raw.length > 2_000) return NextResponse.json({ message: "Solicitud demasiado grande." }, { status: 413 });
    let body: { id?: unknown; action?: unknown };
    try {
      body = JSON.parse(raw) as { id?: unknown; action?: unknown };
    } catch {
      return NextResponse.json({ message: "Formato inválido." }, { status: 400 });
    }
    if (typeof body.id !== "string" || !ObjectId.isValid(body.id) || body.action !== "cancel") {
      return NextResponse.json({ message: "Datos inválidos." }, { status: 400 });
    }

    const db = await getStudioDb();
    const limit = await checkAppointmentRateLimit(db, `customer-cancel:${auth.session.user.id}`, requireAuthSecret(), 10, 10 * 60 * 1000);
    if (!limit.allowed) return NextResponse.json({ message: "Demasiadas solicitudes." }, { status: 429, headers: { "Retry-After": String(limit.retryAfter) } });

    const appointments = db.collection("appointments");
    const id = new ObjectId(body.id);
    const current = await appointments.findOne({ _id: id, userId: auth.session.user.id }, { projection: { status: 1, preferredDate: 1, preferredTime: 1, updatedAt: 1, durationMinutes: 1, slotLockIds: 1 } });
    if (!current) return NextResponse.json({ message: "Turno no encontrado." }, { status: 404 });
    if (!["requested", "confirmed"].includes(String(current.status))) {
      return NextResponse.json({ message: "Este turno ya no se puede cancelar desde tu cuenta." }, { status: 409 });
    }
    const storedAvailability = await db.collection<StudioAvailabilitySettings & { _id: string }>("studio_settings").findOne({ _id: "availability" });
    const availability = storedAvailability
      ? validateStudioAvailability(storedAvailability)
      : { valid: true as const, settings: defaultStudioAvailability };
    if (!availability.valid) return NextResponse.json({ message: "La política de conservación requiere revisión. Contactá al estudio." }, { status: 503 });
    if (current.status === "confirmed") {
      if (typeof availability.settings.cancellationNoticeHours === "number") {
        const appointmentTimestamp = Date.parse(`${current.preferredDate}T${current.preferredTime}:00-03:00`);
        const minimumNoticeMs = availability.settings.cancellationNoticeHours * 60 * 60 * 1000;
        if (!Number.isFinite(appointmentTimestamp) || appointmentTimestamp - Date.now() < minimumNoticeMs) {
          return NextResponse.json({ message: "Ya pasó el plazo de cancelación configurado. Contactá al estudio para asistencia." }, { status: 409 });
        }
      }
    }

    const compareUpdatedAt = current.updatedAt ? { updatedAt: current.updatedAt } : { updatedAt: { $exists: false } };
    const now = new Date();
    const expiresAt = getStudioRetentionExpiry(availability.settings.retention.cancelledDays, now);
    const updatedFields = { status: "cancelled", updatedAt: now, lastInteractionAt: now, cancelledAt: now, cancelledBy: "customer" };
    const update = expiresAt
      ? { $set: { ...updatedFields, expiresAt } }
      : { $set: updatedFields, $unset: { expiresAt: "" } };
    const result = await appointments.updateOne(
      { _id: id, userId: auth.session.user.id, status: current.status, ...compareUpdatedAt },
      update,
    );
    if (!result.matchedCount) return NextResponse.json({ message: "El turno cambió. Actualizá la lista e intentá nuevamente." }, { status: 409 });

    if (current.status === "confirmed") {
      const lockIds = Array.isArray(current.slotLockIds)
        ? current.slotLockIds.filter((lockId: unknown): lockId is string => typeof lockId === "string")
        : getStudioAppointmentSlotLockIds(String(current.preferredDate), String(current.preferredTime), Number(current.durationMinutes) || 15);
      for (const lockId of lockIds) {
        await db.collection<{ _id: string; appointmentId: ObjectId }>("appointment_slot_locks").deleteOne({ _id: lockId, appointmentId: id });
      }
    }
    return NextResponse.json({ success: true, message: "Turno cancelado." }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    logServerError("studio_customer_appointment_cancel_failed", { errorType: error instanceof Error ? error.name : "unknown" });
    return NextResponse.json({ message: "No se pudo cancelar el turno." }, { status: 500 });
  }
}

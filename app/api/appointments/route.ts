import { createHash } from "crypto";
import type { ObjectId } from "mongodb";
import { NextResponse } from "next/server";
import { checkAppointmentRateLimit, isDuplicateKeyError, isValidAppointmentDate, isValidAppointmentTime } from "@/lib/appointments";
import { requireAuthSecret } from "@/lib/auth-secret";
import { getStudioDb, isStudioMongoConfigured } from "@/lib/studio-mongo";
import { requestIdentifier } from "@/lib/request-rate-limit";
import { hasJsonContentType, hasTrustedOrigin } from "@/lib/request-security";
import { recordStudioEvent } from "@/lib/studio-analytics";
function field(value: unknown, max: number) { return typeof value === "string" && value.trim().length > 0 && value.trim().length <= max ? value.trim() : null; }
export async function POST(request: Request) {
  if (!hasTrustedOrigin(request)) return NextResponse.json({ message: "Origen no permitido" }, { status: 403 });
  if (!hasJsonContentType(request)) return NextResponse.json({ message: "Content-Type inválido" }, { status: 415 });
  if (!isStudioMongoConfigured()) return NextResponse.json({ message: "La agenda en línea no está disponible. Escribinos por WhatsApp para consultar." }, { status: 503 });
  try {
    const db = await getStudioDb();
    const rateLimit = await checkAppointmentRateLimit(db, `appointment:${requestIdentifier(request)}`, requireAuthSecret());
    if (!rateLimit.allowed) return NextResponse.json({ message: "Esperá unos minutos antes de volver a intentar." }, { status: 429, headers: { "Retry-After": String(rateLimit.retryAfter) } });
    const rawBody = await request.text();
    if (rawBody.length > 10_000) return NextResponse.json({ message: "La solicitud supera el tamaño permitido." }, { status: 413 });
    let item: Record<string, unknown>;
    try {
      item = JSON.parse(rawBody) as Record<string, unknown>;
    } catch {
      return NextResponse.json({ message: "El formato de la solicitud no es válido." }, { status: 400 });
    }
    const name = field(item.name, 100);
    const email = field(item.email, 254);
    const phone = field(item.phone, 40);
    const style = field(item.style, 80);
    const idea = field(item.idea, 2000);
    const preferredDate = field(item.preferredDate, 10);
    const preferredTime = field(item.preferredTime, 5);
    if (!name || !email || !phone || !style || !idea || !preferredDate || !preferredTime || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !isValidAppointmentDate(preferredDate) || !isValidAppointmentTime(preferredTime)) {
      return NextResponse.json({ message: "Revisá los datos ingresados." }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase();
    const fingerprint = createHash("sha256").update(JSON.stringify({ normalizedEmail, preferredDate, preferredTime, idea })).digest("hex");
    const appointments = db.collection("appointments");
    const activeStatuses = ["requested", "confirmed"];
    const existing = await appointments.findOne({ fingerprint, status: { $in: activeStatuses } });
    if (existing) return NextResponse.json({ message: "Ya recibimos una solicitud igual. Te contactaremos pronto." }, { status: 409 });

    const submissionLocks = db.collection<{ _id: string; createdAt: Date; appointmentId?: ObjectId }>("appointment_submission_locks");
    const lockDate = new Date();
    const existingLock = await submissionLocks.findOne({ _id: fingerprint });
    if (existingLock) {
      const linkedAppointment = existingLock.appointmentId
        ? await appointments.findOne({ _id: existingLock.appointmentId, status: { $in: activeStatuses } })
        : null;
      if (linkedAppointment) return NextResponse.json({ message: "Ya recibimos una solicitud igual. Te contactaremos pronto." }, { status: 409 });
      const lockAge = lockDate.getTime() - existingLock.createdAt.getTime();
      if (!Number.isFinite(lockAge) || lockAge < 120_000) return NextResponse.json({ message: "Ya estamos procesando esa solicitud. Intentá nuevamente en unos minutos." }, { status: 409 });
      await submissionLocks.deleteOne({ _id: fingerprint, createdAt: existingLock.createdAt });
    }
    try {
      await submissionLocks.insertOne({ _id: fingerprint, createdAt: lockDate });
    } catch (error) {
      if (isDuplicateKeyError(error)) return NextResponse.json({ message: "Ya recibimos una solicitud igual. Te contactaremos pronto." }, { status: 409 });
      throw error;
    }

    let insertedId;
    try {
      const result = await appointments.insertOne({ name, email: normalizedEmail, phone, style, idea, preferredDate, preferredTime, fingerprint, status: "requested", createdAt: lockDate, updatedAt: lockDate });
      insertedId = result.insertedId;
    } catch (error) {
      await submissionLocks.deleteOne({ _id: fingerprint, createdAt: lockDate });
      throw error;
    }
    try {
      await submissionLocks.updateOne({ _id: fingerprint, createdAt: lockDate }, { $set: { appointmentId: insertedId } });
    } catch {
      // The saved appointment remains authoritative for duplicate checks.
    }
    try {
      await recordStudioEvent(db, "appointment_request_saved");
    } catch {
      // Analytics must not change the result of a saved request.
    }
    return NextResponse.json({ message: "Solicitud guardada. El estudio revisará tu idea y te contactará para confirmar el turno." }, { status: 201 });
  } catch {
    return NextResponse.json({ message: "No pudimos guardar la solicitud. Intentá nuevamente." }, { status: 500 });
  }
}

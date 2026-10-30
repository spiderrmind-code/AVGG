import { NextResponse } from "next/server";
import { getStudioAvailableStartTimes, defaultStudioAvailability, validateStudioAvailability, type StudioAvailabilitySettings } from "@/lib/studio-availability";
import { getStudioDb, isStudioMongoConfigured } from "@/lib/studio-mongo";
import { resolveStudioDeployment } from "@/lib/studio-routes";
import { logServerError } from "@/lib/logger";
import { checkAppointmentRateLimit, isValidAppointmentDate } from "@/lib/appointments";
import { requireAuthSecret } from "@/lib/auth-secret";
import { requestIdentifier } from "@/lib/request-rate-limit";

export async function GET(request: Request) {
  const deployment = resolveStudioDeployment();
  if (!deployment.enabled) return NextResponse.json({ message: "No encontrado" }, { status: 404 });
  if (!deployment.consistent) return NextResponse.json({ message: "La disponibilidad no está configurada." }, { status: 503 });
  if (!isStudioMongoConfigured()) return NextResponse.json({ message: "La disponibilidad no está disponible." }, { status: 503 });

  try {
    const date = new URL(request.url).searchParams.get("date") ?? "";
    if (!isValidAppointmentDate(date)) return NextResponse.json({ message: "La fecha consultada no es válida." }, { status: 400 });
    const db = await getStudioDb();
    const limit = await checkAppointmentRateLimit(db, `availability:${requestIdentifier(request)}`, requireAuthSecret(), 120, 10 * 60 * 1000);
    if (!limit.allowed) return NextResponse.json({ message: "Demasiadas consultas de disponibilidad." }, { status: 429, headers: { "Retry-After": String(limit.retryAfter), "Cache-Control": "no-store" } });
    const stored = await db.collection<StudioAvailabilitySettings & { _id: string }>("studio_settings").findOne({ _id: "availability" });
    const settings = stored ? validateStudioAvailability(stored) : { valid: true as const, settings: defaultStudioAvailability };
    if (!settings.valid) return NextResponse.json({ message: "La disponibilidad necesita revisión administrativa." }, { status: 503 });
    const durationMinutes = settings.settings.durationMinutes;
    const confirmedAppointments = durationMinutes === null
      ? []
      : await db.collection<{ preferredDate: string; preferredTime: string; durationMinutes?: number }>("appointments")
        .find({ preferredDate: date, status: "confirmed" }, { projection: { _id: 0, preferredDate: 1, preferredTime: 1, durationMinutes: 1 } })
        .toArray();
    return NextResponse.json({
      date,
      times: getStudioAvailableStartTimes(date, settings.settings, confirmedAppointments),
      configured: durationMinutes !== null,
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    logServerError("studio_public_availability_failed", { errorType: error instanceof Error ? error.name : "unknown" });
    return NextResponse.json({ message: "No se pudo consultar la disponibilidad." }, { status: 500, headers: { "Cache-Control": "no-store" } });
  }
}

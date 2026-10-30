import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { ObjectId } from "mongodb";
import { authOptions } from "@/auth";
import { checkAppointmentRateLimit, isDuplicateKeyError, isValidAppointmentDate, isValidAppointmentTime } from "@/lib/appointments";
import { logServerError } from "@/lib/logger";
import { getStudioDb } from "@/lib/studio-mongo";
import { hasJsonContentType, hasTrustedOrigin } from "@/lib/request-security";
import { requestIdentifier } from "@/lib/request-rate-limit";
import { requireAuthSecret } from "@/lib/auth-secret";
import { isAuthorizedStudioAdmin, isStudioDeployment } from "@/lib/studio-routes";
import { defaultStudioAvailability, getStudioAppointmentSlotLockIds, getStudioAvailableStartTimes, getStudioRetentionExpiry, validateStudioAvailability, type StudioAvailabilitySettings } from "@/lib/studio-availability";

async function requireAdmin() {
	if (!isStudioDeployment()) return NextResponse.json({ message: "No encontrado" }, { status: 404 });
	const session = await getServerSession(authOptions);
	if (!session?.user?.email) return NextResponse.json({ message: "No autenticado" }, { status: 401 });
	return isAuthorizedStudioAdmin(session.user.email, session.user.role)
		? null
		: NextResponse.json({ message: "No autorizado" }, { status: 403 });
}

export async function GET(request: Request) {
	const denied = await requireAdmin();
	if (denied) return denied;
	try {
		const db = await getStudioDb();
		const limit = await checkAppointmentRateLimit(db, `admin-appointments:${requestIdentifier(request)}`, requireAuthSecret(), 120, 10 * 60 * 1000);
		if (!limit.allowed) return NextResponse.json({ message: "Demasiadas solicitudes." }, { status: 429, headers: { "Retry-After": String(limit.retryAfter), "Cache-Control": "no-store" } });
		const appointments = await db.collection("appointments").find({}, { projection: { name: 1, email: 1, phone: 1, style: 1, idea: 1, preferredDate: 1, preferredTime: 1, status: 1, userId: 1 } }).sort({ preferredDate: 1, preferredTime: 1, createdAt: -1 }).toArray();
		return NextResponse.json({ appointments }, { headers: { "Cache-Control": "no-store" } });
	} catch (error) {
		logServerError("studio_appointments_list_failed", { errorType: error instanceof Error ? error.name : "unknown" });
		return NextResponse.json({ message: "No se pudieron cargar los turnos." }, { status: 500, headers: { "Cache-Control": "no-store" } });
	}
}
export async function PATCH(request: Request) {
	const denied = await requireAdmin();
	if (denied) return denied;
	if (!hasTrustedOrigin(request) || !hasJsonContentType(request)) return NextResponse.json({ message: "Solicitud inválida" }, { status: 400 });

	try {
		const body = await request.json() as { id?: string; status?: string; preferredDate?: string; preferredTime?: string };
		const validStatuses = ["requested", "confirmed", "rejected", "completed", "cancelled"];
		if (!body.id || !ObjectId.isValid(body.id) || !validStatuses.includes(body.status ?? "")) return NextResponse.json({ message: "Datos inválidos" }, { status: 400 });

		const db = await getStudioDb();
		const limit = await checkAppointmentRateLimit(db, `admin-appointments:${requestIdentifier(request)}`, requireAuthSecret(), 60, 10 * 60 * 1000);
		if (!limit.allowed) return NextResponse.json({ message: "Demasiadas solicitudes." }, { status: 429, headers: { "Retry-After": String(limit.retryAfter), "Cache-Control": "no-store" } });
		const appointments = db.collection("appointments");
		const appointmentId = new ObjectId(body.id);
		const appointment = await appointments.findOne({ _id: appointmentId });
		if (!appointment) return NextResponse.json({ message: "Solicitud no encontrada" }, { status: 404 });

		const status = body.status!;
		const preferredDate = body.preferredDate ?? String(appointment.preferredDate);
		const preferredTime = body.preferredTime ?? String(appointment.preferredTime);
		const activeStatuses = ["requested", "confirmed"];
		if (!isValidAppointmentDate(preferredDate, new Date(), !activeStatuses.includes(status)) || !isValidAppointmentTime(preferredTime)) {
			return NextResponse.json({ message: "Fecha u horario inválido" }, { status: 400 });
		}
		const storedAvailability = await db.collection<StudioAvailabilitySettings & { _id: string }>("studio_settings").findOne({ _id: "availability" });
		const availability = storedAvailability
			? validateStudioAvailability(storedAvailability)
			: { valid: true as const, settings: defaultStudioAvailability };
		if (!availability.valid) return NextResponse.json({ message: "La configuración de Studio requiere revisión antes de actualizar turnos." }, { status: 503 });
		let slotDurationMinutes: number | null = null;
		if (status === "confirmed") {
			if (availability.settings.durationMinutes === null) {
				return NextResponse.json({ message: "Configurá la disponibilidad antes de confirmar turnos." }, { status: 503 });
			}
			slotDurationMinutes = availability.settings.durationMinutes;
			const otherConfirmed = await db.collection<{ preferredDate: string; preferredTime: string; durationMinutes?: number; _id?: ObjectId }>("appointments").find({
				_id: { $ne: appointmentId },
				preferredDate,
				status: "confirmed",
			}, { projection: { _id: 0, preferredDate: 1, preferredTime: 1, durationMinutes: 1 } }).toArray();
			if (!getStudioAvailableStartTimes(preferredDate, availability.settings, otherConfirmed).includes(preferredTime)) {
				return NextResponse.json({ message: "Ese horario está fuera de agenda, bloqueado o se superpone con otro turno." }, { status: 409 });
			}
		}

		const fingerprint = typeof appointment.fingerprint === "string" ? appointment.fingerprint : null;
		const submissionLocks = db.collection<{ _id: string; appointmentId?: ObjectId; createdAt: Date }>("appointment_submission_locks");
		let createdSubmissionLock = false;
		if (activeStatuses.includes(status) && fingerprint) {
			const otherRequest = await appointments.findOne({ _id: { $ne: appointmentId }, fingerprint, status: { $in: activeStatuses } });
			if (otherRequest) return NextResponse.json({ message: "Ya existe una solicitud activa con esos datos." }, { status: 409 });

			const submissionLock = await submissionLocks.findOne({ _id: fingerprint });
			if (submissionLock?.appointmentId && String(submissionLock.appointmentId) !== String(appointmentId)) {
				const owner = await appointments.findOne({ _id: submissionLock.appointmentId, status: { $in: activeStatuses } });
				if (owner) return NextResponse.json({ message: "Ya existe una solicitud activa con esos datos." }, { status: 409 });
				await submissionLocks.deleteOne({ _id: fingerprint, appointmentId: submissionLock.appointmentId });
			}

			if (!submissionLock || (submissionLock.appointmentId && String(submissionLock.appointmentId) !== String(appointmentId))) {
				try {
					await submissionLocks.insertOne({ _id: fingerprint, appointmentId, createdAt: new Date() });
					createdSubmissionLock = true;
				} catch (error) {
					if (isDuplicateKeyError(error)) return NextResponse.json({ message: "Ya existe una solicitud activa con esos datos." }, { status: 409 });
					throw error;
				}
			} else if (!submissionLock.appointmentId) {
				await submissionLocks.updateOne({ _id: fingerprint }, { $set: { appointmentId } });
			}
		}

		const slots = db.collection<{ _id: string; appointmentId: ObjectId; createdAt: Date }>("appointment_slot_locks");
		const previousSlot = `${appointment.preferredDate}T${appointment.preferredTime}`;
		const previousSlotLockIds = Array.isArray(appointment.slotLockIds)
			? appointment.slotLockIds.filter((lockId: unknown): lockId is string => typeof lockId === "string")
			: appointment.status === "confirmed" && isValidAppointmentTime(appointment.preferredTime)
				? getStudioAppointmentSlotLockIds(String(appointment.preferredDate), appointment.preferredTime, Number(appointment.durationMinutes) || slotDurationMinutes || 15)
				: [];
		const nextSlotLockIds = status === "confirmed" && slotDurationMinutes !== null
			? getStudioAppointmentSlotLockIds(preferredDate, preferredTime, slotDurationMinutes)
			: [];
		const createdSlotLockIds: string[] = [];
		if (status === "confirmed") {
			for (const lockId of nextSlotLockIds) {
				const slotLock = await slots.findOne({ _id: lockId });
				if (slotLock && String(slotLock.appointmentId) !== String(appointmentId)) {
					for (const createdId of createdSlotLockIds) await slots.deleteOne({ _id: createdId, appointmentId });
					if (createdSubmissionLock && fingerprint) await submissionLocks.deleteOne({ _id: fingerprint, appointmentId });
					return NextResponse.json({ message: "Ese horario se superpone con otro turno confirmado." }, { status: 409 });
				}
				if (slotLock) continue;
				try {
					await slots.insertOne({ _id: lockId, appointmentId, createdAt: new Date() });
					createdSlotLockIds.push(lockId);
				} catch (error) {
					if (isDuplicateKeyError(error)) {
						for (const createdId of createdSlotLockIds) await slots.deleteOne({ _id: createdId, appointmentId });
						if (createdSubmissionLock && fingerprint) await submissionLocks.deleteOne({ _id: fingerprint, appointmentId });
						return NextResponse.json({ message: "Ese horario se superpone con otro turno confirmado." }, { status: 409 });
					}
					throw error;
				}
			}
		}

		const updatedAtFilter = appointment.updatedAt ? { updatedAt: appointment.updatedAt } : { updatedAt: { $exists: false } };
		const now = new Date();
		const changes: Record<string, unknown> = {
			status,
			preferredDate,
			preferredTime,
			updatedAt: now,
			lastInteractionAt: now,
		};
		if (status === "confirmed" && slotDurationMinutes !== null) {
			changes.durationMinutes = slotDurationMinutes;
			changes.slotLockIds = nextSlotLockIds;
		}
		const unset: Record<string, ""> = {};
		if (status === "cancelled") {
			const cancelledAt = appointment.status === "cancelled" && appointment.cancelledAt instanceof Date ? appointment.cancelledAt : now;
			changes.cancelledAt = cancelledAt;
			const expiresAt = getStudioRetentionExpiry(availability.settings.retention.cancelledDays, cancelledAt);
			if (expiresAt) changes.expiresAt = expiresAt;
			else unset.expiresAt = "";
			unset.completedAt = "";
		} else if (status === "requested" || status === "rejected") {
			const expiresAt = getStudioRetentionExpiry(availability.settings.retention.unconfirmedDays, now);
			if (expiresAt) changes.expiresAt = expiresAt;
			else unset.expiresAt = "";
			unset.cancelledAt = "";
			unset.completedAt = "";
		} else if (status === "completed") {
			const completedAt = appointment.status === "completed" && appointment.completedAt instanceof Date ? appointment.completedAt : now;
			changes.completedAt = completedAt;
			const expiresAt = getStudioRetentionExpiry(availability.settings.retention.completedDays, completedAt);
			if (expiresAt) changes.expiresAt = expiresAt;
			else unset.expiresAt = "";
			unset.cancelledAt = "";
		} else {
			unset.expiresAt = "";
			unset.cancelledAt = "";
			unset.completedAt = "";
		}
		if (status !== "confirmed") unset.slotLockIds = "";
		const update: Record<string, unknown> = { $set: changes };
		if (Object.keys(unset).length) update.$unset = unset;
		let updated;
		try {
			updated = await appointments.updateOne({ _id: appointmentId, ...updatedAtFilter }, update);
		} catch (error) {
			for (const createdId of createdSlotLockIds) await slots.deleteOne({ _id: createdId, appointmentId });
			if (createdSubmissionLock && fingerprint) await submissionLocks.deleteOne({ _id: fingerprint, appointmentId });
			throw error;
		}
		if (!updated.matchedCount) {
			for (const createdId of createdSlotLockIds) await slots.deleteOne({ _id: createdId, appointmentId });
			if (createdSubmissionLock && fingerprint) await submissionLocks.deleteOne({ _id: fingerprint, appointmentId });
			return NextResponse.json({ message: "La solicitud cambió. Actualizá la lista e intentá de nuevo." }, { status: 409 });
		}

		if (appointment.status === "confirmed" && (status !== "confirmed" || previousSlot !== `${preferredDate}T${preferredTime}` || previousSlotLockIds.length !== nextSlotLockIds.length)) {
			for (const oldLockId of previousSlotLockIds) {
				if (!nextSlotLockIds.includes(oldLockId)) await slots.deleteOne({ _id: oldLockId, appointmentId });
			}
		}
		if (!activeStatuses.includes(status) && fingerprint) await submissionLocks.deleteOne({ _id: fingerprint, appointmentId });
		return NextResponse.json({ success: true });
	} catch (error) {
		logServerError("studio_appointment_update_failed", { errorType: error instanceof Error ? error.name : "unknown" });
		return NextResponse.json({ message: "No se pudo actualizar el turno." }, { status: 500 });
	}
}

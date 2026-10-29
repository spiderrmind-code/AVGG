import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { ObjectId } from "mongodb";
import { authOptions } from "@/auth";
import { isDuplicateKeyError, isValidAppointmentDate, isValidAppointmentTime } from "@/lib/appointments";
import { logServerError } from "@/lib/logger";
import { getStudioDb } from "@/lib/studio-mongo";
import { hasJsonContentType, hasTrustedOrigin } from "@/lib/request-security";
import { isAuthorizedStudioAdmin, isStudioDeployment } from "@/lib/studio-routes";

async function requireAdmin() {
	if (!isStudioDeployment()) return NextResponse.json({ message: "No encontrado" }, { status: 404 });
	const session = await getServerSession(authOptions);
	if (!session?.user?.email) return NextResponse.json({ message: "No autenticado" }, { status: 401 });
	return isAuthorizedStudioAdmin(session.user.email, session.user.role)
		? null
		: NextResponse.json({ message: "No autorizado" }, { status: 403 });
}

export async function GET() {
	const denied = await requireAdmin();
	if (denied) return denied;
	try {
		const appointments = await (await getStudioDb()).collection("appointments").find({}, { projection: { fingerprint: 0 } }).sort({ preferredDate: 1, preferredTime: 1, createdAt: -1 }).toArray();
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
		const nextSlot = `${preferredDate}T${preferredTime}`;
		let createdSlotLock = false;
		if (status === "confirmed") {
			const conflict = await appointments.findOne({ _id: { $ne: appointmentId }, status: "confirmed", preferredDate, preferredTime });
			if (conflict) {
				if (createdSubmissionLock && fingerprint) await submissionLocks.deleteOne({ _id: fingerprint, appointmentId });
				return NextResponse.json({ message: "Ese horario ya está confirmado para otro turno." }, { status: 409 });
			}

			const slotLock = await slots.findOne({ _id: nextSlot });
			if (slotLock && String(slotLock.appointmentId) !== String(appointmentId)) {
				if (createdSubmissionLock && fingerprint) await submissionLocks.deleteOne({ _id: fingerprint, appointmentId });
				return NextResponse.json({ message: "Ese horario ya está confirmado para otro turno." }, { status: 409 });
			}
			if (!slotLock) {
				try {
					await slots.insertOne({ _id: nextSlot, appointmentId, createdAt: new Date() });
					createdSlotLock = true;
				} catch (error) {
					if (isDuplicateKeyError(error)) {
						if (createdSubmissionLock && fingerprint) await submissionLocks.deleteOne({ _id: fingerprint, appointmentId });
						return NextResponse.json({ message: "Ese horario ya está confirmado para otro turno." }, { status: 409 });
					}
					throw error;
				}
			}
		}

		const updatedAtFilter = appointment.updatedAt ? { updatedAt: appointment.updatedAt } : { updatedAt: { $exists: false } };
		let updated;
		try {
			updated = await appointments.updateOne({ _id: appointmentId, ...updatedAtFilter }, { $set: { status, preferredDate, preferredTime, updatedAt: new Date() } });
		} catch (error) {
			if (createdSlotLock) await slots.deleteOne({ _id: nextSlot, appointmentId });
			if (createdSubmissionLock && fingerprint) await submissionLocks.deleteOne({ _id: fingerprint, appointmentId });
			throw error;
		}
		if (!updated.matchedCount) {
			if (createdSlotLock) await slots.deleteOne({ _id: nextSlot, appointmentId });
			if (createdSubmissionLock && fingerprint) await submissionLocks.deleteOne({ _id: fingerprint, appointmentId });
			return NextResponse.json({ message: "La solicitud cambió. Actualizá la lista e intentá de nuevo." }, { status: 409 });
		}

		if (appointment.status === "confirmed" && (status !== "confirmed" || previousSlot !== nextSlot)) {
			await slots.deleteOne({ _id: previousSlot, appointmentId });
		}
		if (!activeStatuses.includes(status) && fingerprint) await submissionLocks.deleteOne({ _id: fingerprint, appointmentId });
		return NextResponse.json({ success: true });
	} catch (error) {
		logServerError("studio_appointment_update_failed", { errorType: error instanceof Error ? error.name : "unknown" });
		return NextResponse.json({ message: "No se pudo actualizar el turno." }, { status: 500 });
	}
}

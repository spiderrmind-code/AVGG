"use client";
import { FormEvent, useRef, useState } from "react";
import Link from "next/link";
import { getStudioDate, studioAppointmentStyles } from "@/lib/appointments";
import { getStudioWhatsAppHref } from "@/lib/studio-contact";
export default function TurnosPage() {
	const [message, setMessage] = useState("");
	const [sending, setSending] = useState(false);
	const [success, setSuccess] = useState(false);
	const [savedRequest, setSavedRequest] = useState<Record<string, string> | null>(null);
	const [availableTimes, setAvailableTimes] = useState<string[]>([]);
	const [availabilityMessage, setAvailabilityMessage] = useState("");
	const [loadingTimes, setLoadingTimes] = useState(false);
	const [selectedTime, setSelectedTime] = useState("");
	const availabilityRequest = useRef(0);
	const collectionEnabled = process.env.NEXT_PUBLIC_STUDIO_PRIVACY_APPROVED?.trim().toLowerCase() === "true"
		&& process.env.NEXT_PUBLIC_STUDIO_RETENTION_POLICY_APPROVED?.trim().toLowerCase() === "true"
		&& process.env.NEXT_PUBLIC_STUDIO_DATA_COLLECTION_ENABLED?.trim().toLowerCase() === "true"
		&& process.env.NEXT_PUBLIC_STUDIO_APPOINTMENT_REQUESTS_ENABLED?.trim().toLowerCase() === "true";
	const today = getStudioDate();
	const whatsappMessage = savedRequest
		? [
			"Hola, quiero consultar por una solicitud de turno en 13 Studio Tattoo.",
			`Fecha preferida: ${savedRequest.preferredDate}`,
			`Horario preferido: ${savedRequest.preferredTime}`,
			`Estilo: ${savedRequest.style}`,
			"Quisiera conversar sobre disponibilidad.",
		].join("\n")
		: "";
	const whatsappHref = success ? getStudioWhatsAppHref(whatsappMessage) : null;
	const whatsappFallbackHref = getStudioWhatsAppHref("Hola, quisiera consultar con 13 Studio Tattoo.");

	async function loadTimes(date: string) {
		const requestId = ++availabilityRequest.current;
		setAvailableTimes([]);
		setSelectedTime("");
		setAvailabilityMessage("");
		if (!date) {
			setLoadingTimes(false);
			return;
		}
		setLoadingTimes(true);
		try {
			const response = await fetch(`/api/availability?date=${encodeURIComponent(date)}`, { cache: "no-store" });
			const data = await response.json();
			if (!response.ok) throw new Error(data.message ?? "No se pudo consultar la disponibilidad.");
			if (requestId !== availabilityRequest.current) return;
			setAvailableTimes(Array.isArray(data.times) ? data.times : []);
			setAvailabilityMessage(data.configured ? (data.times.length ? "" : "No hay horarios disponibles para esta fecha.") : "El estudio todavía no configuró su agenda.");
		} catch (error) {
			if (requestId === availabilityRequest.current) setAvailabilityMessage(error instanceof Error ? error.message : "No se pudo consultar la disponibilidad.");
		} finally {
			if (requestId === availabilityRequest.current) setLoadingTimes(false);
		}
	}

	async function submit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		const form = event.currentTarget;
		setSending(true);
		setMessage("");
		setSuccess(false);
		setSavedRequest(null);
		try {
			const requestData = Object.fromEntries(new FormData(form));
			const response = await fetch("/api/appointments", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(requestData),
			});
			const data = await response.json();
			setMessage(data.message ?? "No pudimos enviar tu solicitud.");
			setSuccess(response.status === 201);
			if (response.status === 201) {
				setSavedRequest(Object.fromEntries(Object.entries(requestData).map(([key, value]) => [key, String(value)])));
				form.reset();
				void loadTimes("");
			}
		} catch {
			setMessage("No pudimos enviar la solicitud. Intentá nuevamente.");
		} finally {
			setSending(false);
		}
	}

	return (
		<div className="studio-form-page">
			<div className="studio-form-layout">
				<aside>
					<p className="studio-kicker"><span /> Turnos</p>
					<h1>CONTANOS<br /><em>TU IDEA.</em></h1>
					<p>Guardamos tu solicitud y revisamos la idea antes de contactarte. Pedir un turno no significa que quede confirmado.</p>
					<div className="studio-form-aside-note"><b>01</b><span>Sin pagos ni confirmaciones automáticas.</span></div>
				</aside>
				<form onSubmit={submit} className="studio-form" aria-busy={sending}>
					{collectionEnabled ? <>
					<label className="wide">Nombre y apellido<input required name="name" autoComplete="name" /></label>
					<label>Email<input required name="email" autoComplete="email" type="email" /></label>
					<label>WhatsApp<input required name="phone" autoComplete="tel" type="tel" /></label>
					<label>Estilo<select name="style">{studioAppointmentStyles.map((style) => <option key={style}>{style}</option>)}</select></label>
					<label>Fecha preferida<input required min={today} name="preferredDate" type="date" onChange={(event) => void loadTimes(event.target.value)} /></label>
					<label>Horario disponible<select required name="preferredTime" value={selectedTime} onChange={(event) => setSelectedTime(event.target.value)} disabled={loadingTimes || !availableTimes.length}><option value="" disabled>{loadingTimes ? "Consultando…" : "Elegí un horario"}</option>{availableTimes.map((time) => <option key={time} value={time}>{time}</option>)}</select></label>
					{availabilityMessage ? <p className="studio-form-message wide" role="status">{availabilityMessage}</p> : null}
					<label className="wide">La idea<textarea required name="idea" placeholder="Idea, tamaño aproximado y zona del cuerpo" /></label>
					<label className="wide studio-consent">
						<input required name="privacyConsent" type="checkbox" />
						<span>Leí la <Link href="/politica-de-privacidad" target="_blank" rel="noopener noreferrer">política de privacidad</Link> y autorizo el uso de mis datos para gestionar esta solicitud.</span>
					</label>
					<button disabled={sending || !availableTimes.length || !selectedTime} className="studio-primary wide">{sending ? "Enviando…" : "Enviar solicitud"} <i>↗</i></button>
					{message ? <p className={`studio-form-message ${success ? "is-success" : "is-error"}`} role="status">{success ? "✓ " : "! "}{message}</p> : null}
					{whatsappHref ? <a className="studio-book wide" href={whatsappHref} target="_blank" rel="noopener noreferrer">Continuar por WhatsApp <i>↗</i></a> : null}
					{!success && message && whatsappFallbackHref ? <a className="studio-book wide" href={whatsappFallbackHref} target="_blank" rel="noopener noreferrer">Consultar por WhatsApp <i>↗</i></a> : null}
					</> : <>
						<p className="studio-form-message wide" role="status">La recepción de solicitudes está pausada mientras se finalizan las verificaciones de privacidad.</p>
						{whatsappFallbackHref ? <a className="studio-book wide" href={whatsappFallbackHref} target="_blank" rel="noopener noreferrer">Consultar por WhatsApp <i>↗</i></a> : null}
					</>}
				</form>
			</div>
		</div>
	);
}

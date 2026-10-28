"use client";
import { FormEvent, useState } from "react";
import { getStudioDate } from "@/lib/appointments";
const styles = ["Sin preferencia", "Fine line", "Blackwork", "Color", "Ornamental", "Otro"];
export default function TurnosPage() {
	const [message, setMessage] = useState("");
	const [sending, setSending] = useState(false);
	const [success, setSuccess] = useState(false);
	const [savedRequest, setSavedRequest] = useState<Record<string, string> | null>(null);
	const today = getStudioDate();
	const whatsappNumber = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER?.replace(/\D/g, "");
	const whatsappMessage = savedRequest
		? [
			"Hola, quiero consultar por una solicitud de turno en 13 Studio Tattoo.",
			`Fecha preferida: ${savedRequest.preferredDate}`,
			`Horario preferido: ${savedRequest.preferredTime}`,
			`Estilo: ${savedRequest.style}`,
			"Quisiera conversar sobre disponibilidad.",
		].join("\n")
		: "";
	const whatsappHref = success && whatsappNumber && whatsappMessage
		? `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(whatsappMessage)}`
		: null;
	const whatsappFallbackHref = whatsappNumber
		? `https://wa.me/${whatsappNumber}?text=${encodeURIComponent("Hola, quisiera consultar con 13 Studio Tattoo.")}`
		: null;

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
					<label className="wide">Nombre y apellido<input required name="name" autoComplete="name" /></label>
					<label>Email<input required name="email" autoComplete="email" type="email" /></label>
					<label>WhatsApp<input required name="phone" autoComplete="tel" type="tel" /></label>
					<label>Estilo<select name="style">{styles.map((style) => <option key={style}>{style}</option>)}</select></label>
					<label>Fecha preferida<input required min={today} name="preferredDate" type="date" /></label>
					<label>Horario preferido<input required name="preferredTime" type="time" /></label>
					<label className="wide">La idea<textarea required name="idea" placeholder="Idea, tamaño aproximado y zona del cuerpo" /></label>
					<button disabled={sending} className="studio-primary wide">{sending ? "Enviando…" : "Enviar solicitud"} <i>↗</i></button>
					{message ? <p className={`studio-form-message ${success ? "is-success" : "is-error"}`} role="status">{success ? "✓ " : "! "}{message}</p> : null}
					{whatsappHref ? <a className="studio-book wide" href={whatsappHref} target="_blank" rel="noopener noreferrer">Continuar por WhatsApp <i>↗</i></a> : null}
					{!success && message && whatsappFallbackHref ? <a className="studio-book wide" href={whatsappFallbackHref} target="_blank" rel="noopener noreferrer">Consultar por WhatsApp <i>↗</i></a> : null}
				</form>
			</div>
		</div>
	);
}

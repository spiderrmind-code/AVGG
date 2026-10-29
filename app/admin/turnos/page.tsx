"use client";

import { useEffect, useState } from "react";

type Appointment = {
	_id: string;
	name: string;
	email: string;
	phone: string;
	style: string;
	idea: string;
	preferredDate: string;
	preferredTime: string;
	status: string;
};

const statuses = [["requested", "Solicitado"], ["confirmed", "Confirmado"], ["rejected", "Rechazado"], ["completed", "Realizado"], ["cancelled", "Cancelado"]];

export default function AdminTurnos() {
	const [items, setItems] = useState<Appointment[]>([]);
	const [message, setMessage] = useState("");
	const [loading, setLoading] = useState(true);
	const [savingId, setSavingId] = useState<string | null>(null);

	async function load() {
		setLoading(true);
		try {
			const response = await fetch("/api/admin/appointments", { cache: "no-store" });
			const data = await response.json();
			if (!response.ok) {
				setItems([]);
				setMessage(data.message ?? "No se pudieron cargar los turnos.");
				return false;
			}
			setItems(data.appointments);
			setMessage("");
			return true;
		} catch {
			setItems([]);
			setMessage("No se pudieron cargar los turnos. Revisá tu conexión e intentá nuevamente.");
			return false;
		} finally {
			setLoading(false);
		}
	}

	useEffect(() => {
		const timer = window.setTimeout(() => void load(), 0);
		return () => window.clearTimeout(timer);
	}, []);

	async function update(item: Appointment, changes: Partial<Appointment>) {
		setSavingId(item._id);
		setMessage("");
		try {
			const response = await fetch("/api/admin/appointments", {
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					id: item._id,
					status: changes.status ?? item.status,
					preferredDate: changes.preferredDate ?? item.preferredDate,
					preferredTime: changes.preferredTime ?? item.preferredTime,
				}),
			});
			const data = await response.json();
			if (!response.ok) {
				setMessage(data.message ?? "No se pudo actualizar el turno.");
				return;
			}
			if (await load()) setMessage("Turno actualizado.");
		} catch {
			setMessage("No se pudo actualizar el turno. Revisá tu conexión e intentá nuevamente.");
		} finally {
			setSavingId(null);
		}
	}

	return <main className="studio-admin">
		<div className="studio-admin-head">
			<a href="/admin">← Administración</a>
			<p className="studio-kicker"><span /> Gestión</p>
			<h1>TURNOS</h1>
			<p>Las solicitudes requieren revisión; un cambio de estado a confirmado reserva el horario.</p>
		</div>
		{message ? <p className="studio-admin-message" role="status">{message}</p> : null}
		<div className="studio-admin-list" aria-busy={loading}>
			{loading ? <p role="status">Cargando solicitudes…</p> : items.length ? items.map(item => <article key={item._id} className={`studio-admin-card is-${item.status}`}>
				<div className="studio-admin-person">
					<span className="studio-status">{statuses.find(([value]) => value === item.status)?.[1] ?? item.status}</span>
					<h2>{item.name}</h2>
					<p>{item.email}<br />{item.phone}</p>
				</div>
				<div><p className="studio-admin-style">{item.style}</p><p className="studio-admin-idea">{item.idea}</p></div>
				<div className="studio-admin-controls">
					<input aria-label={`Fecha preferida de ${item.name}`} value={item.preferredDate} type="date" onChange={event => setItems(current => current.map(value => value._id === item._id ? { ...value, preferredDate: event.target.value } : value))} />
					<input aria-label={`Horario preferido de ${item.name}`} value={item.preferredTime ?? ""} type="time" onChange={event => setItems(current => current.map(value => value._id === item._id ? { ...value, preferredTime: event.target.value } : value))} />
					<select aria-label={`Estado de ${item.name}`} value={item.status} disabled={savingId === item._id} onChange={event => void update(item, { status: event.target.value })}>{statuses.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
					<button type="button" disabled={savingId === item._id} onClick={() => void update(item, {})}>{savingId === item._id ? "Guardando…" : "Guardar"}</button>
				</div>
			</article>) : <p className="studio-admin-empty">No hay solicitudes todavía.</p>}
		</div>
	</main>;
}

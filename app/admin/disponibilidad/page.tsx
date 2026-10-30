"use client";

import { useEffect, useState, type FormEvent } from "react";
import type { StudioRetentionSettings } from "@/lib/studio-availability";

type DaySettings = { enabled: boolean; start: string; end: string; breakStart: string; breakEnd: string };
type Settings = {
  durationMinutes: number | null;
  cancellationNoticeHours: number | null;
  weeklySchedule: Array<{ weekday: number; intervals: Array<{ start: string; end: string }> }>;
  blockedDates: string[];
  retention: StudioRetentionSettings;
};

const dayNames = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
const emptyDays = (): DaySettings[] => dayNames.map(() => ({ enabled: false, start: "", end: "", breakStart: "", breakEnd: "" }));

function toSettings(days: DaySettings[], duration: string, notice: string, blockedDates: string, retention: StudioRetentionSettings): Settings {
  return {
    durationMinutes: duration ? Number(duration) : null,
    cancellationNoticeHours: notice ? Number(notice) : null,
    retention,
    weeklySchedule: days.map((day, weekday) => {
      if (!day.enabled) return { weekday, intervals: [] };
      const intervals = day.breakStart && day.breakEnd
        ? [{ start: day.start, end: day.breakStart }, { start: day.breakEnd, end: day.end }]
        : [{ start: day.start, end: day.end }];
      return { weekday, intervals };
    }),
    blockedDates: blockedDates.split(/\r?\n/).map((date) => date.trim()).filter(Boolean),
  };
}

function fromSettings(settings: Settings) {
  const days = emptyDays();
  for (const day of settings.weeklySchedule) {
    if (!day.intervals.length) continue;
    days[day.weekday] = {
      enabled: true,
      start: day.intervals[0].start,
      end: day.intervals[day.intervals.length - 1].end,
      breakStart: day.intervals.length > 1 ? day.intervals[0].end : "",
      breakEnd: day.intervals.length > 1 ? day.intervals[1].start : "",
    };
  }
  return {
    days,
    duration: settings.durationMinutes?.toString() ?? "",
    notice: settings.cancellationNoticeHours?.toString() ?? "",
    blockedDates: settings.blockedDates.join("\n"),
    retention: settings.retention,
  };
}

export default function AdminAvailabilityPage() {
  const [days, setDays] = useState<DaySettings[]>(emptyDays);
  const [duration, setDuration] = useState("");
  const [notice, setNotice] = useState("");
  const [blockedDates, setBlockedDates] = useState("");
  const [unconfirmedDays, setUnconfirmedDays] = useState("");
  const [cancelledDays, setCancelledDays] = useState("");
  const [completedDays, setCompletedDays] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(() => {
      void fetch("/api/admin/availability", { cache: "no-store" })
        .then(async (response) => {
          const data = await response.json();
          if (!response.ok) throw new Error(data.message ?? "No se pudo cargar la disponibilidad.");
          if (active) {
            const form = fromSettings(data.settings as Settings);
            setDays(form.days);
            setDuration(form.duration);
            setNotice(form.notice);
            setBlockedDates(form.blockedDates);
            setUnconfirmedDays(form.retention.unconfirmedDays?.toString() ?? "");
            setCancelledDays(form.retention.cancelledDays?.toString() ?? "");
            setCompletedDays(form.retention.completedDays?.toString() ?? "");
          }
        })
        .catch((error: unknown) => {
          if (active) setMessage(error instanceof Error ? error.message : "No se pudo cargar la disponibilidad.");
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    }, 0);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, []);

  function updateDay(index: number, patch: Partial<DaySettings>) {
    setDays((current) => current.map((day, dayIndex) => dayIndex === index ? { ...day, ...patch } : day));
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (days.some((day) => day.enabled && Boolean(day.breakStart) !== Boolean(day.breakEnd))) {
      setMessage("Completá ambos horarios de la pausa o dejalos vacíos.");
      return;
    }
    setSaving(true);
    setMessage("");
    try {
      const response = await fetch("/api/admin/availability", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(toSettings(days, duration, notice, blockedDates, {
          unconfirmedDays: unconfirmedDays ? Number(unconfirmedDays) : null,
          cancelledDays: cancelledDays ? Number(cancelledDays) : null,
          completedDays: completedDays ? Number(completedDays) : null,
        })),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message ?? "No se pudo guardar la disponibilidad.");
      setMessage("Disponibilidad guardada. Los cambios se aplican a las próximas solicitudes.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo guardar la disponibilidad.");
    } finally {
      setSaving(false);
    }
  }

  return <main className="studio-admin">
    <div className="studio-admin-head">
      <nav className="flex flex-wrap gap-4"><a href="/admin/turnos">Turnos</a><a href="/admin/clientes">Clientes</a></nav>
      <p className="studio-kicker"><span /> Configuración</p>
      <h1>DISPONIBILIDAD</h1>
      <p>La agenda empieza cerrada. Configurá horarios reales del estudio antes de recibir solicitudes; ningún horario se presupone.</p>
    </div>
    {message ? <p className="studio-admin-message" role="status">{message}</p> : null}
    {loading ? <p role="status">Cargando configuración…</p> : <form className="studio-availability-form" onSubmit={save} aria-busy={saving}>
      <section>
        <h2>Duración y cancelaciones</h2>
        <label>Duración del turno (minutos)
          <input type="number" min="15" max="480" step="15" required value={duration} onChange={(event) => setDuration(event.target.value)} />
        </label>
        <label>Preaviso mínimo para cancelaciones (horas)
          <input type="number" min="0" max="720" step="1" value={notice} onChange={(event) => setNotice(event.target.value)} placeholder="Sin regla configurada" />
        </label>
      </section>
      <section>
        <h2>Atención semanal</h2>
        <p>Podés definir una pausa diaria; los espacios de duración insuficiente para un turno no se ofrecerán.</p>
        <div className="studio-availability-days">
          {days.map((day, index) => <fieldset key={dayNames[index]}>
            <label className="studio-availability-toggle"><input type="checkbox" checked={day.enabled} onChange={(event) => updateDay(index, { enabled: event.target.checked })} />{dayNames[index]}</label>
            {day.enabled ? <>
              <label>Desde<input type="time" required value={day.start} onChange={(event) => updateDay(index, { start: event.target.value })} /></label>
              <label>Hasta<input type="time" required value={day.end} onChange={(event) => updateDay(index, { end: event.target.value })} /></label>
              <label>Pausa desde<input type="time" value={day.breakStart} onChange={(event) => updateDay(index, { breakStart: event.target.value })} /></label>
              <label>Pausa hasta<input type="time" value={day.breakEnd} onChange={(event) => updateDay(index, { breakEnd: event.target.value })} /></label>
            </> : <p>Cerrado</p>}
          </fieldset>)}
        </div>
      </section>
      <section>
        <h2>Fechas sin atención</h2>
        <label>Una fecha por línea (AAAA-MM-DD)
          <textarea rows={5} value={blockedDates} onChange={(event) => setBlockedDates(event.target.value)} placeholder="AAAA-MM-DD" />
        </label>
      </section>
      <section>
        <h2>Conservación y eliminación</h2>
        <p>Los plazos están pendientes de aprobación. Dejá cada campo vacío para no programar una eliminación automática; no habilites la recopilación hasta aprobar la política.</p>
        <p>Al guardar, los plazos actualizan registros Studio existentes. Si una fecha ya venció, MongoDB puede borrar el registro de la base primaria; los backups requieren un ciclo separado.</p>
        <label>Solicitudes sin confirmar (días)
          <input type="number" min="1" max="3650" step="1" value={unconfirmedDays} onChange={(event) => setUnconfirmedDays(event.target.value)} placeholder="Pendiente de decisión" />
        </label>
        <label>Turnos cancelados (días)
          <input type="number" min="1" max="3650" step="1" value={cancelledDays} onChange={(event) => setCancelledDays(event.target.value)} placeholder="Pendiente de decisión" />
        </label>
        <label>Turnos completados (días)
          <input type="number" min="1" max="3650" step="1" value={completedDays} onChange={(event) => setCompletedDays(event.target.value)} placeholder="Pendiente de decisión" />
        </label>
      </section>
      <button className="studio-primary" type="submit" disabled={saving}>{saving ? "Guardando…" : "Guardar disponibilidad"} <i>↗</i></button>
    </form>}
  </main>;
}

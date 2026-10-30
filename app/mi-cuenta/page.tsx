"use client";

import { signOut, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

type CustomerAppointment = {
  _id: string;
  style: string;
  idea: string;
  preferredDate: string;
  preferredTime: string;
  status: string;
};

type CustomerProfile = {
  name: string;
  email: string;
  phone: string;
};

const appointmentStatusLabels: Record<string, string> = {
  requested: "Solicitud recibida",
  confirmed: "Confirmado",
  rejected: "No disponible",
  completed: "Realizado",
  cancelled: "Cancelado",
};

export default function MiCuentaPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [appointments, setAppointments] = useState<CustomerAppointment[]>([]);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadAccount = useCallback(async () => {
    try {
      const [profileResponse, appointmentsResponse] = await Promise.all([
        fetch("/api/account", { cache: "no-store" }),
        fetch("/api/my-appointments", { cache: "no-store" }),
      ]);
      if (!profileResponse.ok || !appointmentsResponse.ok) {
        setMessage("No se pudo cargar tu cuenta. Volvé a iniciar sesión e intentá nuevamente.");
        return;
      }
      const profileData = await profileResponse.json();
      const appointmentsData = await appointmentsResponse.json();
      setProfile(profileData.user);
      setName(profileData.user.name ?? "");
      setPhone(profileData.user.phone ?? "");
      setAppointments(appointmentsData.appointments);
      setMessage("");
    } catch {
      setMessage("No se pudo cargar tu cuenta. Revisá tu conexión e intentá nuevamente.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/login");
    if (status === "authenticated") {
      const timer = window.setTimeout(() => void loadAccount(), 0);
      return () => window.clearTimeout(timer);
    }
    return undefined;
  }, [status, router, loadAccount]);

  async function saveProfile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    try {
      const response = await fetch("/api/account", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone }),
      });
      const data = await response.json();
      if (!response.ok) {
        setMessage(data.message ?? "No se pudieron guardar tus datos.");
        return;
      }
      setProfile((current) => current ? { ...current, name, phone } : current);
      setMessage("Datos guardados.");
    } catch {
      setMessage("No se pudieron guardar tus datos. Revisá tu conexión.");
    } finally {
      setSaving(false);
    }
  }

  async function cancelAppointment(appointmentId: string) {
    setCancellingId(appointmentId);
    setMessage("");
    try {
      const response = await fetch("/api/my-appointments", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: appointmentId, action: "cancel" }),
      });
      const data = await response.json();
      if (!response.ok) {
        setMessage(data.message ?? "No se pudo cancelar el turno.");
        return;
      }
      await loadAccount();
      setMessage("Turno cancelado.");
    } catch {
      setMessage("No se pudo cancelar el turno. Revisá tu conexión.");
    } finally {
      setCancellingId(null);
    }
  }

  async function deleteAccount() {
    if (!window.confirm("¿Eliminar tu cuenta y anonimizar los datos personales vinculados a tus solicitudes? Esta acción no se puede deshacer.")) return;
    setDeleting(true);
    setMessage("");
    try {
      const response = await fetch("/api/account", { method: "DELETE" });
      const data = await response.json();
      if (!response.ok) {
        setMessage(data.message ?? "No se pudo eliminar la cuenta.");
        return;
      }
      await signOut({ callbackUrl: "/" });
    } catch {
      setMessage("No se pudo eliminar la cuenta. Revisá tu conexión e intentá nuevamente.");
    } finally {
      setDeleting(false);
    }
  }

  if (status === "loading" || loading) {
    return <main className="studio-form-page"><p role="status">Cargando tu cuenta…</p></main>;
  }
  if (!session || session.user.role !== "customer") {
    return <main className="studio-form-page"><p role="alert">No autorizado.</p></main>;
  }

  return <main className="studio-form-page">
    <section className="mx-auto w-full max-w-4xl px-5 py-12">
      <p className="studio-kicker"><span /> Mi cuenta</p>
      <h1 className="mt-4 text-4xl font-black">TUS <em>TURNOS.</em></h1>
      <p className="mt-3 text-neutral-300">Ingresaste como {profile?.email ?? session.user.email}.</p>
      <a href="/turnos" className="studio-book mt-5 inline-flex">Solicitar un turno <i>↗</i></a>
      {message ? <p className="mt-5 rounded-xl border border-white/15 p-4" role="status">{message}</p> : null}
      <form onSubmit={saveProfile} className="mt-8 grid gap-4 rounded-2xl border border-white/10 p-5 sm:grid-cols-2">
        <label className="grid gap-2">Nombre<input className="premium-input" maxLength={120} value={name} onChange={(event) => setName(event.target.value)} required /></label>
        <label className="grid gap-2">WhatsApp<input className="premium-input" maxLength={40} type="tel" value={phone} onChange={(event) => setPhone(event.target.value)} /></label>
        <button className="studio-primary sm:col-span-2" disabled={saving}>{saving ? "Guardando…" : "Guardar datos"}</button>
      </form>

      <section className="mt-12" aria-labelledby="appointments-heading">
        <h2 id="appointments-heading" className="text-2xl font-bold">Historial de solicitudes</h2>
        {appointments.length ? <div className="mt-5 grid gap-4">
          {appointments.map((appointment) => <article key={appointment._id} className="rounded-2xl border border-white/10 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <strong>{appointmentStatusLabels[appointment.status] ?? appointment.status}</strong>
              <span>{appointment.preferredDate} · {appointment.preferredTime}</span>
            </div>
            <p className="mt-2 text-sm text-neutral-300">{appointment.style}</p>
            <p className="mt-3 whitespace-pre-wrap">{appointment.idea}</p>
            {["requested", "confirmed"].includes(appointment.status) ? <button type="button" className="mt-4 rounded-full border border-white/25 px-4 py-2" disabled={cancellingId === appointment._id} onClick={() => void cancelAppointment(appointment._id)}>{cancellingId === appointment._id ? "Cancelando…" : "Cancelar solicitud"}</button> : null}
          </article>)}
        </div> : <p className="mt-4 text-neutral-300">Todavía no hay solicitudes vinculadas a esta cuenta. Podés pedir un turno como invitado o con sesión iniciada.</p>}
      </section>
      <button type="button" className="mt-8 rounded-full border border-white/20 px-4 py-2" onClick={() => void signOut({ callbackUrl: "/" })}>Cerrar sesión</button>
      <button type="button" className="ml-3 mt-8 rounded-full border border-rose-400/50 px-4 py-2 text-rose-200" disabled={deleting} onClick={() => void deleteAccount()}>{deleting ? "Eliminando…" : "Eliminar cuenta y anonimizar datos"}</button>
    </section>
  </main>;
}

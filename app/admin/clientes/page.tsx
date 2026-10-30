"use client";

import { useEffect, useState } from "react";

type Client = { id: string; name: string; email: string; phone: string; createdAt: string };

export default function AdminClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(() => {
      void fetch(`/api/admin/clients?page=${page}`, { cache: "no-store" })
        .then(async (response) => {
          const data = await response.json();
          if (!response.ok) throw new Error(data.message ?? "No se pudieron cargar los clientes.");
          if (active) {
            setClients(data.clients);
            setTotal(data.total);
            setMessage("");
          }
        })
        .catch((error: unknown) => {
          if (active) setMessage(error instanceof Error ? error.message : "No se pudieron cargar los clientes.");
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    }, 0);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [page]);

  return <main className="studio-admin">
    <div className="studio-admin-head">
      <nav className="flex flex-wrap gap-4"><a href="/admin/turnos">Turnos</a><a href="/admin/disponibilidad">Disponibilidad</a></nav>
      <p className="studio-kicker"><span /> Gestión</p>
      <h1>CLIENTES</h1>
      <p>Datos mínimos de las cuentas de cliente. Las solicitudes de turno se consultan en el panel de turnos.</p>
    </div>
    {message ? <p className="studio-admin-message" role="alert">{message}</p> : null}
    <div className="studio-admin-list" aria-busy={loading}>
      {loading ? <p role="status">Cargando clientes…</p> : clients.length ? clients.map((client) => <article key={client.id} className="studio-admin-card">
        <div className="studio-admin-person"><h2>{client.name || "Sin nombre"}</h2><p>{client.email}<br />{client.phone || "Sin teléfono"}</p></div>
        <p>Cuenta creada: {client.createdAt ? new Date(client.createdAt).toLocaleDateString("es-AR") : "—"}</p>
      </article>) : <p className="studio-admin-empty">No hay clientes registrados.</p>}
    </div>
    <div className="mt-6 flex items-center justify-between">
      <button type="button" className="studio-book" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>Anterior</button>
      <span>{total ? `${(page - 1) * 25 + 1}–${Math.min(page * 25, total)} de ${total}` : "0 clientes"}</span>
      <button type="button" className="studio-book" disabled={page * 25 >= total} onClick={() => setPage((value) => value + 1)}>Siguiente</button>
    </div>
  </main>;
}

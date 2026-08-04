"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

interface SupplierFormState {
  name: string;
  description: string;
  logo: string;
  country: string;
  city: string;
  address: string;
  contact: string;
  email: string;
  phone: string;
  website: string;
  status: "active" | "paused" | "blocked";
  type: "manual" | "csv" | "api";
  externalId: string;
  apiUrl: string;
}

interface SupplierRow extends Partial<SupplierFormState> {
  _id: string;
}

const emptySupplier: SupplierFormState = {
  name: "",
  description: "",
  logo: "",
  country: "",
  city: "",
  address: "",
  contact: "",
  email: "",
  phone: "",
  website: "",
  status: "active",
  type: "manual",
  externalId: "",
  apiUrl: "",
};

export default function SuppliersAdminPage() {
  const [suppliers, setSuppliers] = useState<SupplierRow[]>([]);
  const [form, setForm] = useState<SupplierFormState>(emptySupplier);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  const loadSuppliers = async () => {
    try {
      const response = await fetch("/api/admin/suppliers");
      const data = await response.json();
      setSuppliers(data.suppliers ?? []);
    } catch {
      setMessage("No se pudieron cargar los proveedores");
    }
  };

  useEffect(() => {
    queueMicrotask(() => { void loadSuppliers(); });
  }, []);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      const response = await fetch(editingId ? `/api/admin/suppliers/${editingId}` : "/api/admin/suppliers", {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await response.json();
      setMessage(data.message || (editingId ? "Proveedor actualizado" : "Proveedor creado"));
      setForm(emptySupplier);
      setEditingId(null);
      await loadSuppliers();
    } catch {
      setMessage("No se pudo guardar el proveedor");
    }
  };

  const editSupplier = (supplier: SupplierRow) => {
    setEditingId(String(supplier._id));
    setForm({
      name: supplier.name ?? "",
      description: supplier.description ?? "",
      logo: supplier.logo ?? "",
      country: supplier.country ?? "",
      city: supplier.city ?? "",
      address: supplier.address ?? "",
      contact: supplier.contact ?? "",
      email: supplier.email ?? "",
      phone: supplier.phone ?? "",
      website: supplier.website ?? "",
      status: (supplier.status ?? "active") as SupplierFormState["status"],
      type: (supplier.type ?? "manual") as SupplierFormState["type"],
      externalId: supplier.externalId ?? "",
      apiUrl: supplier.apiUrl ?? "",
    });
  };

  const toggleStatus = async (supplier: SupplierRow) => {
    const nextStatus = supplier.status === "active" ? "paused" : "active";
    try {
      await fetch(`/api/admin/suppliers/${supplier._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      await loadSuppliers();
    } catch {
      setMessage("No se pudo cambiar el estado");
    }
  };

  const totalActive = useMemo(() => suppliers.filter((supplier) => supplier.status === "active").length, [suppliers]);

  return (
    <main className="min-h-screen bg-neutral-50 px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.3em] text-neutral-500">Gestión de proveedores</p>
            <h1 className="mt-2 text-3xl font-semibold text-neutral-950">Proveedores y sourcing</h1>
            <p className="mt-2 max-w-2xl text-sm text-neutral-600">Centraliza el abastecimiento, el estado operativo y la información base para cada proveedor.</p>
          </div>
          <div className="flex gap-3">
            <Link href="/admin" className="rounded-full border border-neutral-200 bg-white px-4 py-2 text-sm font-semibold text-neutral-900">Volver al panel</Link>
          </div>
        </div>

        {message ? <div className="mb-6 rounded-2xl border border-neutral-200 bg-white p-4 text-sm text-neutral-700">{message}</div> : null}

        <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <section className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold">{editingId ? "Editar proveedor" : "Agregar proveedor"}</h2>
                <p className="mt-1 text-sm text-neutral-600">Prepárate para integrar proveedores manuales, CSV o APIs.</p>
              </div>
              <div className="rounded-full bg-neutral-100 px-3 py-1 text-sm font-semibold text-neutral-700">{totalActive} activos</div>
            </div>
            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <input className="w-full rounded-2xl border border-neutral-300 px-3 py-2" placeholder="Nombre" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required />
              <textarea className="w-full rounded-2xl border border-neutral-300 px-3 py-2" placeholder="Descripción" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} />
              <div className="grid gap-4 md:grid-cols-2">
                <input className="w-full rounded-2xl border border-neutral-300 px-3 py-2" placeholder="País" value={form.country} onChange={(event) => setForm({ ...form, country: event.target.value })} />
                <input className="w-full rounded-2xl border border-neutral-300 px-3 py-2" placeholder="Ciudad" value={form.city} onChange={(event) => setForm({ ...form, city: event.target.value })} />
              </div>
              <input className="w-full rounded-2xl border border-neutral-300 px-3 py-2" placeholder="Dirección" value={form.address} onChange={(event) => setForm({ ...form, address: event.target.value })} />
              <div className="grid gap-4 md:grid-cols-2">
                <input className="w-full rounded-2xl border border-neutral-300 px-3 py-2" placeholder="Contacto" value={form.contact} onChange={(event) => setForm({ ...form, contact: event.target.value })} />
                <input className="w-full rounded-2xl border border-neutral-300 px-3 py-2" placeholder="Email" type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <input className="w-full rounded-2xl border border-neutral-300 px-3 py-2" placeholder="Teléfono" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} />
                <input className="w-full rounded-2xl border border-neutral-300 px-3 py-2" placeholder="Página web" value={form.website} onChange={(event) => setForm({ ...form, website: event.target.value })} />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <select className="w-full rounded-2xl border border-neutral-300 px-3 py-2" value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as SupplierFormState["status"] })}>
                  <option value="active">Activo</option>
                  <option value="paused">Pausado</option>
                  <option value="blocked">Bloqueado</option>
                </select>
                <select className="w-full rounded-2xl border border-neutral-300 px-3 py-2" value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value as SupplierFormState["type"] })}>
                  <option value="manual">Manual</option>
                  <option value="csv">CSV</option>
                  <option value="api">API</option>
                </select>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <input className="w-full rounded-2xl border border-neutral-300 px-3 py-2" placeholder="External ID" value={form.externalId} onChange={(event) => setForm({ ...form, externalId: event.target.value })} />
                <input className="w-full rounded-2xl border border-neutral-300 px-3 py-2" placeholder="API URL" value={form.apiUrl} onChange={(event) => setForm({ ...form, apiUrl: event.target.value })} />
              </div>
              <input className="w-full rounded-2xl border border-neutral-300 px-3 py-2" placeholder="Logo URL" value={form.logo} onChange={(event) => setForm({ ...form, logo: event.target.value })} />
              <div className="flex gap-3">
                <button className="flex-1 rounded-2xl bg-black px-4 py-3 text-sm font-semibold text-white">{editingId ? "Actualizar proveedor" : "Guardar proveedor"}</button>
                {editingId ? <button type="button" onClick={() => { setEditingId(null); setForm(emptySupplier); }} className="rounded-2xl border border-neutral-300 px-4 py-3 text-sm font-semibold text-neutral-900">Cancelar</button> : null}
              </div>
            </form>
          </section>

          <section className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold">Listado</h2>
                <p className="mt-1 text-sm text-neutral-600">Gestiona el estado operativo y la visibilidad del proveedor.</p>
              </div>
            </div>
            <div className="mt-6 space-y-3">
              {suppliers.map((supplier) => (
                <div key={supplier._id} className="rounded-2xl border border-neutral-200 p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-semibold text-neutral-950">{supplier.name}</p>
                      <p className="text-sm text-neutral-600">{supplier.email ?? supplier.contact ?? "Sin contacto"}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${supplier.status === "active" ? "bg-emerald-100 text-emerald-700" : supplier.status === "paused" ? "bg-amber-100 text-amber-700" : "bg-rose-100 text-rose-700"}`}>{supplier.status ?? "active"}</span>
                      <button type="button" onClick={() => toggleStatus(supplier)} className="rounded-full border border-neutral-300 px-3 py-1 text-sm font-semibold text-neutral-900">{supplier.status === "active" ? "Pausar" : "Activar"}</button>
                      <button type="button" onClick={() => editSupplier(supplier)} className="rounded-full border border-neutral-300 px-3 py-1 text-sm font-semibold text-neutral-900">Editar</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

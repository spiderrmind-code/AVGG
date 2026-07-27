"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

interface SupplierDetail {
  _id: string;
  name?: string;
  description?: string;
  country?: string;
  city?: string;
  contact?: string;
  email?: string;
  phone?: string;
  website?: string;
  status?: string;
  type?: string;
  apiUrl?: string;
  externalId?: string;
  syncStatus?: string;
  lastSync?: string;
}

export default function SupplierDetailPage() {
  const params = useParams();
  const [supplier, setSupplier] = useState<SupplierDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        const response = await fetch(`/api/admin/suppliers/${params.id}`);
        const data = await response.json();
        if (!data.success) throw new Error(data.message || "No se pudo cargar");
        setSupplier(data.supplier);
      } catch {
        setError("No se pudo cargar el proveedor");
      } finally {
        setLoading(false);
      }
    };

    if (params.id) load();
  }, [params.id]);

  if (loading) {
    return <main className="min-h-screen bg-neutral-50 px-4 py-10 sm:px-6 lg:px-8"><div className="mx-auto max-w-6xl rounded-3xl border border-neutral-200 bg-white p-8 text-sm text-neutral-600">Cargando proveedor…</div></main>;
  }

  if (error || !supplier) {
    return <main className="min-h-screen bg-neutral-50 px-4 py-10 sm:px-6 lg:px-8"><div className="mx-auto max-w-6xl rounded-3xl border border-rose-200 bg-rose-50 p-8 text-sm text-rose-700">{error || "Proveedor no encontrado"}</div></main>;
  }

  return (
    <main className="min-h-screen bg-neutral-50 px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.3em] text-neutral-500">Detalle de proveedor</p>
            <h1 className="mt-2 text-3xl font-semibold text-neutral-950">{supplier.name}</h1>
            <p className="mt-2 text-sm text-neutral-600">Vista operativa para revisar datos, estado y sincronización.</p>
          </div>
          <div className="flex gap-3">
            <Link href="/admin/suppliers" className="rounded-full border border-neutral-200 bg-white px-4 py-2 text-sm font-semibold text-neutral-900">Volver a proveedores</Link>
            <Link href="/admin" className="rounded-full bg-black px-4 py-2 text-sm font-semibold text-white">Panel admin</Link>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <section className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold">Información general</h2>
            <div className="mt-6 space-y-3 text-sm text-neutral-700">
              <div className="flex items-center justify-between"><span>Estado</span><span className="font-semibold">{supplier.status ?? "active"}</span></div>
              <div className="flex items-center justify-between"><span>Tipo</span><span className="font-semibold">{supplier.type ?? "manual"}</span></div>
              <div className="flex items-center justify-between"><span>País</span><span className="font-semibold">{supplier.country ?? "—"}</span></div>
              <div className="flex items-center justify-between"><span>Ciudad</span><span className="font-semibold">{supplier.city ?? "—"}</span></div>
              <div className="flex items-center justify-between"><span>Contacto</span><span className="font-semibold">{supplier.contact ?? "—"}</span></div>
              <div className="flex items-center justify-between"><span>Email</span><span className="font-semibold">{supplier.email ?? "—"}</span></div>
              <div className="flex items-center justify-between"><span>Web</span><span className="font-semibold">{supplier.website ?? "—"}</span></div>
            </div>
          </section>

          <section className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold">Sincronización</h2>
            <div className="mt-6 space-y-3 text-sm text-neutral-700">
              <div className="flex items-center justify-between"><span>Estado API</span><span className="font-semibold">{supplier.syncStatus ?? "idle"}</span></div>
              <div className="flex items-center justify-between"><span>Última sincronización</span><span className="font-semibold">{supplier.lastSync ? new Date(supplier.lastSync).toLocaleString("es-AR") : "No ejecutada"}</span></div>
              <div className="flex items-center justify-between"><span>Endpoint</span><span className="font-semibold">{supplier.apiUrl ?? "Sin endpoint"}</span></div>
              <div className="flex items-center justify-between"><span>External ID</span><span className="font-semibold">{supplier.externalId ?? "—"}</span></div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

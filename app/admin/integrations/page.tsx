"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface IntegrationItem {
  _id: string;
  supplierId?: string;
  apiUrl?: string;
  status?: string;
  lastSync?: string;
}

export default function IntegrationsPage() {
  const [integrations, setIntegrations] = useState<IntegrationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        const response = await fetch("/api/admin/suppliers");
        const data = await response.json();
        setIntegrations((data.suppliers ?? []).map((supplier: any) => ({
          _id: supplier._id,
          supplierId: supplier._id,
          apiUrl: supplier.apiUrl,
          status: supplier.syncStatus ?? "idle",
          lastSync: supplier.lastSync,
        })));
      } catch {
        setError("No se pudieron cargar las integraciones");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  return (
    <main className="min-h-screen bg-neutral-50 px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.3em] text-neutral-500">Integraciones</p>
            <h1 className="mt-2 text-3xl font-semibold text-neutral-950">Proveedores y sincronización</h1>
            <p className="mt-2 text-sm text-neutral-600">Conecta APIs externas, valida credenciales y prepara sincronización futura.</p>
          </div>
          <Link href="/admin" className="rounded-full border border-neutral-200 bg-white px-4 py-2 text-sm font-semibold text-neutral-900">Volver al panel</Link>
        </div>

        {loading ? <div className="rounded-3xl border border-neutral-200 bg-white p-6 text-sm text-neutral-600">Cargando integraciones…</div> : null}
        {error ? <div className="rounded-3xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700">{error}</div> : null}

        <div className="grid gap-4 md:grid-cols-2">
          {integrations.map((integration) => (
            <div key={integration._id} className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-lg font-semibold text-neutral-950">{integration.supplierId}</p>
                  <p className="mt-1 text-sm text-neutral-600">{integration.apiUrl ?? "Sin endpoint configurado"}</p>
                </div>
                <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-semibold text-neutral-700">{integration.status ?? "idle"}</span>
              </div>
              <div className="mt-6 flex items-center justify-between text-sm text-neutral-600">
                <span>Última sincronización</span>
                <span>{integration.lastSync ? new Date(integration.lastSync).toLocaleString("es-AR") : "No ejecutada"}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}

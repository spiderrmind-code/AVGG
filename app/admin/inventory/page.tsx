"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface InventoryItem {
  _id: string;
  name?: string;
  title?: string;
  stock?: boolean | number;
  supplierStock?: number | boolean;
  active?: boolean;
  supplier?: string;
  sku?: string;
}

export default function InventoryPage() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        const response = await fetch("/api/admin/products");
        const data = await response.json();
        setItems(data.products ?? []);
      } catch {
        setError("No se pudo cargar el inventario");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const getStatus = (item: InventoryItem) => {
    if (item.active === false) return "Pausado";
    const supplierStock = Number(item.supplierStock ?? item.stock ?? 0);
    if (supplierStock <= 0 || item.stock === false) return "Agotado";
    if (supplierStock <= 3) return "Bajo stock";
    return "Disponible";
  };

  return (
    <main className="ui-admin-main">
      <div className="mx-auto max-w-7xl">
        <div className="ui-surface ui-admin-header">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.3em] text-neutral-500">Inventario</p>
            <h1 className="mt-2 text-3xl font-semibold text-neutral-950">Control de stock</h1>
            <p className="mt-2 text-sm text-neutral-600">Supervisa stock propio, stock del proveedor y estados operativos.</p>
          </div>
          <Link href="/admin" className="ui-button-secondary">Volver al panel</Link>
        </div>

        {loading ? <div className="rounded-3xl border border-neutral-200 bg-white p-6 text-sm text-neutral-600">Cargando inventario…</div> : null}
        {error ? <div className="rounded-3xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700">{error}</div> : null}

        <div className="ui-surface overflow-hidden">
          <div className="overflow-x-auto">
            <table className="ui-admin-table">
              <thead>
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500">Producto</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500">SKU</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500">Proveedor</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500">Stock</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500">Estado</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item._id}>
                    <td className="px-4 py-4 text-sm text-neutral-900">{item.title ?? item.name}</td>
                    <td className="px-4 py-4 text-sm text-neutral-700">{item.sku ?? "—"}</td>
                    <td className="px-4 py-4 text-sm text-neutral-700">{item.supplier ?? "—"}</td>
                    <td className="px-4 py-4 text-sm text-neutral-700">{Number(item.supplierStock ?? item.stock ?? 0)}</td>
                    <td className="px-4 py-4 text-sm">
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${getStatus(item) === "Disponible" ? "bg-emerald-100 text-emerald-700" : getStatus(item) === "Bajo stock" ? "bg-amber-100 text-amber-700" : getStatus(item) === "Pausado" ? "bg-neutral-100 text-neutral-700" : "bg-rose-100 text-rose-700"}`}>
                        {getStatus(item)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>
  );
}

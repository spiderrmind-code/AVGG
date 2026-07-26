"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";

export default function AccountOrdersPage() {
  const { data: session, status } = useSession();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status !== "authenticated") return;
    fetch("/api/orders")
      .then((res) => res.json())
      .then((data) => setOrders(data.orders ?? []))
      .finally(() => setLoading(false));
  }, [status]);

  if (status === "loading" || loading) {
    return <main className="min-h-screen bg-neutral-50 px-4 py-16">Cargando pedidos...</main>;
  }

  if (!session) {
    return <main className="min-h-screen bg-neutral-50 px-4 py-16">Debes iniciar sesión para ver tus pedidos.</main>;
  }

  function friendlyStatus(order: any) {
    const ps = order.paymentStatus ?? order.status ?? "pending";
    const map: Record<string, string> = {
      approved: "Pagado",
      rejected: "Cancelado",
      pending: "Pendiente pago",
      paid: "Pagado",
      processing: "Preparando",
      cancelled: "Cancelado",
      shipped: "Enviado",
      delivered: "Entregado",
    };
    return map[String(ps).toLowerCase()] ?? String(ps);
  }

  return (
    <main className="min-h-screen bg-neutral-50 px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl rounded-3xl border border-neutral-200 bg-white p-8 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-neutral-500">Mis compras</p>
            <h1 className="mt-2 text-3xl font-semibold">Historial de pedidos</h1>
          </div>
          <Link href="/account" className="text-sm font-semibold text-black">Volver al perfil</Link>
        </div>

        <div className="mt-8 space-y-4">
          {orders.length === 0 ? (
            <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-6 text-sm text-neutral-600">Todavía no tenés pedidos.</div>
          ) : (
            orders.map((order) => (
              <div key={order._id} className="rounded-2xl border border-neutral-200 p-5">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-semibold">{order.orderNumber}</p>
                    <p className="text-sm text-neutral-600">{order.createdAt ? new Date(order.createdAt).toLocaleDateString("es-AR") : "Reciente"}</p>
                  </div>
                  <div className="text-sm text-neutral-600">Total: ${order.total}</div>
                </div>
                <div className="mt-3 text-sm text-neutral-600">Estado: {friendlyStatus(order)}</div>
              </div>
            ))
          )}
        </div>
      </div>
    </main>
  );
}

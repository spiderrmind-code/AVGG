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
    return <main className="min-h-screen bg-transparent px-4 py-16 sm:px-6 lg:px-8"><div className="mx-auto max-w-5xl rounded-[2rem] border border-neutral-200 bg-white/80 p-8 shadow-[0_20px_60px_rgba(0,0,0,0.06)]">Cargando pedidos...</div></main>;
  }

  if (!session) {
    return <main className="min-h-screen bg-transparent px-4 py-16 sm:px-6 lg:px-8"><div className="mx-auto max-w-5xl rounded-[2rem] border border-neutral-200 bg-white/80 p-8 shadow-[0_20px_60px_rgba(0,0,0,0.06)]">Debes iniciar sesión para ver tus pedidos.</div></main>;
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
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(0,0,0,0.03),_transparent_45%)] px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl rounded-[2rem] border border-white/70 bg-white/80 p-8 shadow-[0_24px_80px_rgba(0,0,0,0.08)] backdrop-blur-xl">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-neutral-500">Mis compras</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-[-0.02em] text-neutral-950">Historial de pedidos</h1>
          </div>
          <Link href="/account" className="text-sm font-semibold text-neutral-700 transition hover:text-neutral-950">Volver al perfil</Link>
        </div>

        <div className="mt-8 space-y-4">
          {orders.length === 0 ? (
            <div className="rounded-[1.5rem] border border-white/70 bg-neutral-50/80 p-6 text-sm text-neutral-600">Todavía no tenés pedidos.</div>
          ) : (
            orders.map((order) => (
              <div key={order._id} className="rounded-[1.5rem] border border-white/70 bg-white/80 p-5 shadow-[0_12px_40px_rgba(0,0,0,0.04)]">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-semibold text-neutral-950">{order.orderNumber}</p>
                    <p className="text-sm text-neutral-600">{order.createdAt ? new Date(order.createdAt).toLocaleDateString("es-AR") : "Reciente"}</p>
                  </div>
                  <div className="text-sm text-neutral-600">Total: ${order.total}</div>
                </div>
                <div className="mt-3 inline-flex rounded-full border border-neutral-200 bg-neutral-50 px-3 py-1 text-sm text-neutral-700">Estado: {friendlyStatus(order)}</div>
              </div>
            ))
          )}
        </div>
      </div>
    </main>
  );
}

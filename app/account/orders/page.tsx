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
    return <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(200,169,107,0.16),_transparent_35%),linear-gradient(180deg,_#f7f3ea_0%,_#f1ece4_100%)] px-4 py-16 sm:px-6 lg:px-8"><div className="mx-auto max-w-5xl rounded-[2.2rem] border border-white/70 bg-white/80 p-8 shadow-[0_20px_80px_rgba(0,0,0,0.06)] backdrop-blur-xl">Cargando pedidos...</div></main>;
  }

  if (!session) {
    return <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(200,169,107,0.16),_transparent_35%),linear-gradient(180deg,_#f7f3ea_0%,_#f1ece4_100%)] px-4 py-16 sm:px-6 lg:px-8"><div className="mx-auto max-w-5xl rounded-[2.2rem] border border-white/70 bg-white/80 p-8 shadow-[0_20px_80px_rgba(0,0,0,0.06)] backdrop-blur-xl">Debes iniciar sesión para ver tus pedidos.</div></main>;
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
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(200,169,107,0.16),_transparent_35%),linear-gradient(180deg,_#f7f3ea_0%,_#f1ece4_100%)] px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl rounded-[2.2rem] border border-white/70 bg-white/80 p-8 shadow-[0_24px_90px_rgba(0,0,0,0.08)] backdrop-blur-xl sm:p-10">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-neutral-500">Mis compras</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-[-0.02em] text-neutral-950">Historial de pedidos</h1>
          </div>
          <Link href="/account" className="text-sm font-semibold text-neutral-700 transition hover:text-neutral-950">Volver al perfil</Link>
        </div>

        <div className="mt-8 space-y-4">
          {orders.length === 0 ? (
            <div className="rounded-[1.6rem] border border-black/10 bg-white/70 p-6 text-sm text-neutral-600">Todavía no tenés pedidos.</div>
          ) : (
            orders.map((order) => {
              const status = friendlyStatus(order);
              const chipClass = status.includes("Pagado") || status.includes("Enviado") || status.includes("Entregado") ? "border-emerald-200 bg-emerald-50 text-emerald-700" : status.includes("Cancelado") ? "border-rose-200 bg-rose-50 text-rose-700" : "border-amber-200 bg-amber-50 text-amber-700";
              return (
                <div key={order._id} className="rounded-[1.6rem] border border-black/10 bg-white/80 p-5 shadow-[0_16px_50px_rgba(0,0,0,0.05)]">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-semibold text-neutral-950">{order.orderNumber}</p>
                      <p className="mt-1 text-sm text-neutral-600">{order.createdAt ? new Date(order.createdAt).toLocaleDateString("es-AR") : "Reciente"}</p>
                    </div>
                    <div className="text-sm text-neutral-600">Total: ${order.total}</div>
                  </div>
                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    <span className={`inline-flex rounded-full border px-3 py-1 text-sm ${chipClass}`}>{status}</span>
                    <span className="inline-flex rounded-full border border-black/10 bg-white/80 px-3 py-1 text-sm text-neutral-600">Seguimiento activo</span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </main>
  );
}

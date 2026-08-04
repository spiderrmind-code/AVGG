"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import CjFulfillmentPanel from "../components/CjFulfillmentPanel";

interface OrderRow {
  _id: string;
  orderNumber: string;
  customer?: { firstName?: string; lastName?: string; email?: string };
  status?: string;
  paymentStatus?: string;
  total?: number;
  tracking?: string;
  createdAt?: string;
}

export default function OperationsPage() {
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [trackingMap, setTrackingMap] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");
  const [cjOrderId, setCjOrderId] = useState<string | null>(null);

  const loadOrders = async () => {
    try {
      const response = await fetch("/api/admin/orders");
      const data = await response.json();
      setOrders(data.orders ?? []);
    } catch {
      setMessage("No se pudieron cargar los pedidos");
    }
  };

  useEffect(() => {
    queueMicrotask(() => { void loadOrders(); });
  }, []);

  const updateStatus = async (orderId: string, status: string) => {
    try {
      const response = await fetch("/api/admin/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: orderId, status }),
      });
      const data = await response.json();
      if (data.success) {
        setMessage("Estado actualizado");
        await loadOrders();
      }
    } catch {
      setMessage("No se pudo actualizar el pedido");
    }
  };

  const saveTracking = async (orderId: string) => {
    try {
      const tracking = trackingMap[orderId] ?? "";
      const response = await fetch("/api/admin/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: orderId, tracking, status: "shipped" }),
      });
      const data = await response.json();
      if (data.success) {
        setMessage("Tracking actualizado");
        await loadOrders();
      }
    } catch {
      setMessage("No se pudo guardar el tracking");
    }
  };

  return (
    <main className="ui-admin-main">
      <div className="mx-auto max-w-7xl">
        <div className="ui-surface ui-admin-header">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.3em] text-neutral-500">Centro operativo</p>
            <h1 className="mt-2 text-3xl font-semibold text-neutral-950">Gestión de pedidos</h1>
            <p className="mt-2 text-sm text-neutral-600">Controla el estado de los pedidos, el proveedor y el tracking desde un solo lugar.</p>
          </div>
          <Link href="/admin" className="ui-button-secondary">Volver al panel</Link>
        </div>

        {message ? <div className="ui-card mb-6 p-4 text-sm text-neutral-700">{message}</div> : null}

        <div className="ui-surface overflow-hidden">
          <div className="overflow-x-auto">
            <table className="ui-admin-table">
              <thead>
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500">Pedido</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500">Cliente</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500">Estado</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500">Tracking</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order._id} className="align-top">
                    <td className="px-4 py-4 text-sm text-neutral-900">
                      <div className="font-semibold">{order.orderNumber}</div>
                      <div className="mt-1 text-xs text-neutral-500">{order.createdAt ? new Date(order.createdAt).toLocaleDateString("es-AR") : "Reciente"}</div>
                    </td>
                    <td className="px-4 py-4 text-sm text-neutral-700">
                      <div>{order.customer?.firstName ? `${order.customer.firstName} ${order.customer.lastName ?? ""}`.trim() : "Cliente"}</div>
                      <div className="mt-1 text-xs text-neutral-500">{order.customer?.email ?? "Sin email"}</div>
                    </td>
                    <td className="px-4 py-4 text-sm text-neutral-700">
                      <select value={order.status ?? order.paymentStatus ?? "pending"} onChange={(event) => updateStatus(String(order._id), event.target.value)} className="px-3 py-2 text-sm">
                        <option value="pending">Pendiente proveedor</option>
                        <option value="paid">Pago aprobado</option>
                        <option value="processing">Preparando</option>
                        <option value="shipped">Enviado</option>
                        <option value="delivered">Entregado</option>
                        <option value="cancelled">Cancelado</option>
                      </select>
                    </td>
                    <td className="px-4 py-4 text-sm text-neutral-700">
                      <input className="w-full px-3 py-2" value={trackingMap[order._id] ?? order.tracking ?? ""} onChange={(event) => setTrackingMap((prev) => ({ ...prev, [order._id]: event.target.value }))} placeholder="Tracking" />
                    </td>
                    <td className="px-4 py-4 text-sm text-neutral-700">
                      <button type="button" onClick={() => saveTracking(order._id)} className="ui-button-primary min-h-0 px-3 py-2">Guardar</button>
                      <button type="button" onClick={() => setCjOrderId((current) => current === order._id ? null : order._id)} className="ui-button-secondary ml-2 min-h-0 px-3 py-2">CJ</button>
                      {cjOrderId === order._id ? <CjFulfillmentPanel orderId={order._id} /> : null}
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

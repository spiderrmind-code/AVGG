"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatARS } from "@/lib/currency";

type Payment = { orderId: string; orderNumber?: string; paymentId: string; status?: string; statusDetail: string; amount: number; currency: string; method: string; date: string | null };

export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]); const [status, setStatus] = useState(""); const [error, setError] = useState("");
  useEffect(() => { queueMicrotask(() => { void (async () => { try { const response = await fetch(`/api/admin/payments?status=${encodeURIComponent(status)}`); const data = await response.json() as { payments?: Payment[] }; if (!response.ok) throw new Error(); setPayments(data.payments ?? []); } catch { setError("No se pudieron cargar los pagos"); } })(); }); }, [status]);
  return <main className="ui-admin-main"><div className="mx-auto max-w-7xl"><div className="ui-surface ui-admin-header"><div><h1 className="text-3xl font-semibold">Pagos</h1><p className="mt-2 text-sm text-neutral-600">Vista de sólo lectura basada en órdenes verificadas.</p></div><Link href="/admin" className="ui-button-secondary">Volver al panel</Link></div><select className="mb-4 rounded-xl border p-3" value={status} onChange={(event) => setStatus(event.target.value)} aria-label="Filtrar pagos"><option value="">Todos los estados</option>{["approved", "pending", "rejected", "cancelled", "refunded", "charged_back"].map((item) => <option key={item}>{item}</option>)}</select>{error ? <p className="mb-4 text-sm text-rose-700">{error}</p> : null}<div className="ui-surface overflow-x-auto"><table className="ui-admin-table"><thead><tr><th>Orden</th><th>Pago</th><th>Estado</th><th>Detalle</th><th>Monto</th><th>Método</th><th>Fecha</th></tr></thead><tbody>{payments.map((payment) => <tr key={payment.orderId}><td>{payment.orderNumber ?? payment.orderId}</td><td>{payment.paymentId}</td><td>{payment.status ?? "Sin información"}</td><td>{payment.statusDetail}</td><td>{payment.currency === "ARS" ? formatARS(payment.amount) : `${payment.currency} ${payment.amount}`}</td><td>{payment.method}</td><td>{payment.date ? new Date(payment.date).toLocaleString("es-AR") : "Sin información"}</td></tr>)}</tbody></table></div></div></main>;
}

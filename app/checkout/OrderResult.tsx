"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";

type Order = { _id: string; orderNumber?: string; items: Array<{ _id: string; name: string; price: number; quantity: number }>; total: number; currency: string; status: string; paymentStatus: string; customerEmail?: string };
type ResultKind = "success" | "failure" | "pending";

const copy = {
  success: { eyebrow: "Pago recibido", title: "Estamos confirmando tu pago", body: "El pago sólo se confirmará cuando recibamos y validemos la notificación oficial de Mercado Pago.", primary: "Seguir comprando", href: "/" },
  failure: { eyebrow: "Pago no completado", title: "No pudimos procesar tu pago", body: "No se descuenta stock hasta que un pago aprobado sea validado oficialmente.", primary: "Volver al checkout", href: "/checkout" },
  pending: { eyebrow: "Pago pendiente", title: "Tu pago está en revisión", body: "La confirmación puede demorar. Te avisaremos cuando Mercado Pago la confirme.", primary: "Volver al inicio", href: "/" },
} as const;

export default function OrderResult({ kind }: { kind: ResultKind }) {
  const params = useSearchParams();
  const { status: sessionStatus } = useSession();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const orderId = params.get("external_reference") ?? params.get("orderId");
  const text = copy[kind];

  useEffect(() => {
    if (!orderId) { setLoading(false); return; }
    const token = typeof window === "undefined" ? null : sessionStorage.getItem(`avgconnects_order_access_${orderId}`);
    fetch(`/api/orders?orderId=${encodeURIComponent(orderId)}`, { headers: token ? { "X-Guest-Order-Token": token } : undefined })
      .then(async (response) => response.ok ? response.json() : null)
      .then((data) => setOrder(data?.order ?? null))
      .catch(() => setOrder(null))
      .finally(() => setLoading(false));
  }, [orderId, sessionStatus]);

  return <main className="min-h-screen px-4 py-16 sm:px-6 lg:px-8"><div className="ui-surface mx-auto max-w-2xl p-8 text-center">
    <p className="text-sm font-semibold uppercase tracking-[0.2em] text-neutral-500">{text.eyebrow}</p><h1 className="mt-4 text-3xl font-semibold">{text.title}</h1><p className="mt-4 text-neutral-600">{text.body}</p>
    {loading ? <p className="mt-6 text-sm text-neutral-500" aria-live="polite">Buscando tu pedido…</p> : null}
    {order ? <section className="ui-card mt-6 p-5 text-left"><p className="font-semibold">Pedido {order.orderNumber ?? order._id}</p><p className="mt-1 text-sm text-neutral-600">Estado: {order.paymentStatus}</p>{order.customerEmail ? <p className="mt-1 text-sm text-neutral-600">{order.customerEmail}</p> : null}<div className="mt-4 space-y-2 text-sm">{order.items.map((item) => <div className="flex justify-between gap-4" key={item._id}><span>{item.name} × {item.quantity}</span><span>{order.currency} {(item.price * item.quantity).toLocaleString("es-AR")}</span></div>)}</div><p className="mt-4 border-t pt-4 text-lg font-semibold">Total: {order.currency} {order.total.toLocaleString("es-AR")}</p></section> : null}
    <div className="mt-8 flex flex-wrap justify-center gap-3"><Link href={text.href} className="ui-button-primary">{text.primary}</Link>{sessionStatus === "authenticated" ? <Link href="/account/orders" className="ui-button-secondary">Mi cuenta</Link> : null}</div>
  </div></main>;
}

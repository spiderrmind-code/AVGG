"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

function CheckoutSuccessContent() {
  const searchParams = useSearchParams();
  const pending = searchParams.get("status") === "pending";

  return (
    <main className="min-h-screen bg-neutral-50 px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl rounded-3xl border border-neutral-200 bg-white p-8 text-center shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-neutral-500">{pending ? "Pedido registrado" : "Pago recibido"}</p>
        <h1 className="mt-4 text-3xl font-semibold">{pending ? "Tu pedido quedó registrado" : "¡Gracias por tu compra!"}</h1>
        <p className="mt-4 text-neutral-600">
          {pending
            ? "El pedido se creó correctamente y queda pendiente de confirmación. Te contactaremos para el seguimiento."
            : "Tu pedido quedó registrado y te estaremos contactando con el seguimiento."}
        </p>
        <Link href="/" className="mt-8 inline-flex rounded-xl bg-black px-5 py-3 text-sm font-semibold text-white">Seguir comprando</Link>
      </div>
    </main>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-neutral-50 px-4 py-16 text-center">Cargando...</div>}>
      <CheckoutSuccessContent />
    </Suspense>
  );
}

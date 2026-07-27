"use client";

import { useState } from "react";
import Link from "next/link";

export default function OffersPage() {
  const [discount, setDiscount] = useState("15");
  const [previousPrice, setPreviousPrice] = useState("50000");
  const [offerPrice, setOfferPrice] = useState("42500");

  return (
    <main className="min-h-screen bg-neutral-50 px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.3em] text-neutral-500">Ofertas</p>
            <h1 className="mt-2 text-3xl font-semibold text-neutral-950">Promociones y descuentos</h1>
            <p className="mt-2 text-sm text-neutral-600">Administra descuentos temporales y combos para la tienda.</p>
          </div>
          <Link href="/admin" className="rounded-full border border-neutral-200 bg-white px-4 py-2 text-sm font-semibold text-neutral-900">Volver al panel</Link>
        </div>

        <div className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
          <div className="grid gap-4 md:grid-cols-3">
            <input className="w-full rounded-xl border border-neutral-300 px-3 py-2" type="number" value={discount} onChange={(event) => setDiscount(event.target.value)} placeholder="Descuento %" />
            <input className="w-full rounded-xl border border-neutral-300 px-3 py-2" type="number" value={previousPrice} onChange={(event) => setPreviousPrice(event.target.value)} placeholder="Precio anterior" />
            <input className="w-full rounded-xl border border-neutral-300 px-3 py-2" type="number" value={offerPrice} onChange={(event) => setOfferPrice(event.target.value)} placeholder="Precio oferta" />
          </div>
          <div className="mt-6 rounded-2xl bg-neutral-950 p-6 text-white">
            <p className="text-sm text-neutral-400">Vista previa de promoción</p>
            <p className="mt-2 text-2xl font-semibold">{discount}% OFF</p>
            <p className="mt-2 text-sm text-neutral-300">Antes: ${Number(previousPrice).toLocaleString("es-AR")} · Ahora: ${Number(offerPrice).toLocaleString("es-AR")}</p>
          </div>
        </div>
      </div>
    </main>
  );
}

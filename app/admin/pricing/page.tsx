"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { calculateRecommendedPrice, estimateProfit } from "@/lib/pricing";

export default function PricingPage() {
  const [costPriceInput, setCostPriceInput] = useState("20000");
  const [shippingCostInput, setShippingCostInput] = useState("2000");
  const [commissionInput, setCommissionInput] = useState("3000");
  const [otherCostsInput, setOtherCostsInput] = useState("0");
  const [marginInput, setMarginInput] = useState("40");

  const pricingSummary = useMemo(() => {
    const recommended = calculateRecommendedPrice({
      costPrice: Number(costPriceInput || 0),
      shippingCost: Number(shippingCostInput || 0),
      paymentCommissionFixed: Number(commissionInput || 0),
      otherCosts: Number(otherCostsInput || 0),
      desiredMargin: Number(marginInput || 0),
    });

    const profit = estimateProfit({
      salePrice: recommended.recommendedPrice,
      costPrice: Number(costPriceInput || 0),
      shippingCost: Number(shippingCostInput || 0),
      paymentCommissionFixed: Number(commissionInput || 0),
      otherCosts: Number(otherCostsInput || 0),
    });

    return { recommended, profit };
  }, [costPriceInput, shippingCostInput, commissionInput, otherCostsInput, marginInput]);

  return (
    <main className="min-h-screen bg-neutral-50 px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.3em] text-neutral-500">Pricing</p>
            <h1 className="mt-2 text-3xl font-semibold text-neutral-950">Motor de precios</h1>
            <p className="mt-2 text-sm text-neutral-600">Calcula precio recomendado y margen real con base en costos operativos.</p>
          </div>
          <Link href="/admin" className="rounded-full border border-neutral-200 bg-white px-4 py-2 text-sm font-semibold text-neutral-900">Volver al panel</Link>
        </div>

        <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <section className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold">Parámetros</h2>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <input className="w-full rounded-xl border border-neutral-300 px-3 py-2" type="number" value={costPriceInput} onChange={(event) => setCostPriceInput(event.target.value)} placeholder="Costo proveedor" />
              <input className="w-full rounded-xl border border-neutral-300 px-3 py-2" type="number" value={shippingCostInput} onChange={(event) => setShippingCostInput(event.target.value)} placeholder="Costo envío" />
              <input className="w-full rounded-xl border border-neutral-300 px-3 py-2" type="number" value={commissionInput} onChange={(event) => setCommissionInput(event.target.value)} placeholder="Comisión MP" />
              <input className="w-full rounded-xl border border-neutral-300 px-3 py-2" type="number" value={otherCostsInput} onChange={(event) => setOtherCostsInput(event.target.value)} placeholder="Otros costos" />
            </div>
            <div className="mt-4">
              <label className="text-sm font-medium text-neutral-700">Margen deseado (%)</label>
              <input className="mt-2 w-full rounded-xl border border-neutral-300 px-3 py-2" type="number" value={marginInput} onChange={(event) => setMarginInput(event.target.value)} placeholder="Margen (%)" />
            </div>
          </section>

          <section className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold">Resultado</h2>
            <div className="mt-6 rounded-2xl bg-neutral-950 p-6 text-white">
              <p className="text-sm text-neutral-400">Precio recomendado</p>
              <p className="mt-2 text-3xl font-semibold">${pricingSummary.recommended.recommendedPrice.toLocaleString("es-AR")}</p>
              <div className="mt-6 grid gap-3 text-sm text-neutral-300 sm:grid-cols-2">
                <div>Costos totales: ${pricingSummary.recommended.totalCosts.toLocaleString("es-AR")}</div>
                <div>Ganancia estimada: ${pricingSummary.profit.profit.toLocaleString("es-AR")}</div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

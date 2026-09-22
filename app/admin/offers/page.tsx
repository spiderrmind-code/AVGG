"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Product = { _id: string; name?: string; title?: string; price: number; active?: boolean };
type Promotion = { _id: string; productId: string; basePrice: number; promotionalPrice: number; discountPercent: number; status: string; product?: Product };

function money(value: number) { return value.toLocaleString("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }); }

export default function OffersPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [productId, setProductId] = useState("");
  const [promotionalPrice, setPromotionalPrice] = useState("");
  const [type, setType] = useState("percentage");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [message, setMessage] = useState("");

  async function load() {
    const [productsResponse, promotionsResponse] = await Promise.all([fetch("/api/admin/products?limit=100"), fetch("/api/admin/promotions")]);
    const productsData = await productsResponse.json();
    const promotionsData = await promotionsResponse.json();
    setProducts(productsData.products ?? []);
    setPromotions(promotionsData.promotions ?? []);
  }

  useEffect(() => { void Promise.resolve().then(load); }, []);

  async function createPromotion(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    const response = await fetch("/api/admin/promotions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ productId, promotionalPrice: Number(promotionalPrice), type, startsAt, endsAt }) });
    const data = await response.json();
    if (!response.ok) { setMessage(data.message ?? "No se pudo crear la promoción"); return; }
    setMessage("Promoción guardada con datos reales del producto.");
    setPromotionalPrice("");
    void load();
  }

  return (
    <main className="min-h-screen bg-neutral-50 px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div><p className="text-sm font-medium uppercase tracking-[0.3em] text-neutral-500">Ofertas</p><h1 className="mt-2 text-3xl font-semibold text-neutral-950">Promociones y descuentos</h1><p className="mt-2 text-sm text-neutral-600">Solo se activan promociones con producto, precio y stock reales.</p></div>
          <Link href="/admin" className="rounded-full border border-neutral-200 bg-white px-4 py-2 text-sm font-semibold text-neutral-900">Volver al panel</Link>
        </div>
        <form onSubmit={createPromotion} className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="text-sm font-semibold text-neutral-700">Producto<select required value={productId} onChange={(event) => setProductId(event.target.value)} className="mt-2 w-full rounded-xl border border-neutral-300 px-3 py-2 font-normal"><option value="">Seleccionar producto real</option>{products.filter((product) => product.active !== false).map((product) => <option key={product._id} value={product._id}>{product.title ?? product.name} · {money(product.price)}</option>)}</select></label>
            <label className="text-sm font-semibold text-neutral-700">Precio promocional<input required min="0.01" step="0.01" type="number" value={promotionalPrice} onChange={(event) => setPromotionalPrice(event.target.value)} className="mt-2 w-full rounded-xl border border-neutral-300 px-3 py-2 font-normal" /></label>
            <label className="text-sm font-semibold text-neutral-700">Tipo<select value={type} onChange={(event) => setType(event.target.value)} className="mt-2 w-full rounded-xl border border-neutral-300 px-3 py-2 font-normal"><option value="percentage">Porcentaje calculado</option><option value="fixed">Precio fijo</option></select></label>
            <label className="text-sm font-semibold text-neutral-700">Inicio<input required type="datetime-local" value={startsAt} onChange={(event) => setStartsAt(event.target.value)} className="mt-2 w-full rounded-xl border border-neutral-300 px-3 py-2 font-normal" /></label>
            <label className="text-sm font-semibold text-neutral-700">Vencimiento<input required type="datetime-local" value={endsAt} onChange={(event) => setEndsAt(event.target.value)} className="mt-2 w-full rounded-xl border border-neutral-300 px-3 py-2 font-normal" /></label>
          </div>
          <p className="mt-4 text-xs text-neutral-500">El precio base y el descuento se toman del precio actual del producto. No se aceptan precios originales inventados.</p>
          {message ? <p className="mt-4 text-sm font-semibold text-neutral-700" role="status">{message}</p> : null}
          <button type="submit" className="mt-5 rounded-xl bg-neutral-950 px-4 py-3 text-sm font-semibold text-white">Guardar promoción</button>
        </form>
        <div className="mt-8 overflow-x-auto rounded-3xl border border-neutral-200 bg-white shadow-sm"><table className="w-full min-w-[720px] text-left text-sm"><thead className="border-b border-neutral-200 text-xs uppercase tracking-wider text-neutral-500"><tr><th className="p-4">Producto</th><th className="p-4">Base</th><th className="p-4">Promoción</th><th className="p-4">Descuento</th><th className="p-4">Estado</th></tr></thead><tbody>{promotions.map((promotion) => <tr key={promotion._id} className="border-b border-neutral-100"><td className="p-4 font-semibold">{promotion.product?.title ?? promotion.product?.name ?? promotion.productId}</td><td className="p-4">{money(promotion.basePrice)}</td><td className="p-4">{money(promotion.promotionalPrice)}</td><td className="p-4">{promotion.discountPercent}%</td><td className="p-4">{promotion.status}</td></tr>)}{promotions.length === 0 ? <tr><td colSpan={5} className="p-8 text-center text-neutral-500">No hay promociones guardadas.</td></tr> : null}</tbody></table></div>
      </div>
    </main>
  );
}

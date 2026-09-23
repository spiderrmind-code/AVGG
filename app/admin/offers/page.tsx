"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Product = { _id: string; name?: string; title?: string; price: number; active?: boolean };
type Promotion = { _id: string; productId: string; basePrice: number; promotionalPrice: number; discountPercent: number; type: string; kind: string; startsAt: string; endsAt: string; status: string; product?: Product };
type Filter = "all" | "active" | "scheduled" | "expired" | "paused" | "cancelled";

function money(value: number) { return value.toLocaleString("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }); }
function dateInput(value: string) { return value ? new Date(value).toISOString().slice(0, 16) : ""; }
function dateLabel(value: string) { return new Date(value).toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" }); }
function kindLabel(value: string) { return value === "flash_sale" ? "Flash Sale" : value === "daily_offer" ? "Oferta del día" : "Oferta temporal"; }

export default function OffersPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [editing, setEditing] = useState<Promotion | null>(null);
  const [productId, setProductId] = useState("");
  const [promotionalPrice, setPromotionalPrice] = useState("");
  const [type, setType] = useState("fixed");
  const [kind, setKind] = useState("temporal_offer");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [message, setMessage] = useState("");

  async function load() {
    const [productsResponse, promotionsResponse] = await Promise.all([fetch("/api/admin/products?limit=100"), fetch("/api/admin/promotions")]);
    const productsData = await productsResponse.json();
    const promotionsData = await promotionsResponse.json();
    setProducts(productsData.products ?? []);
    setPromotions(promotionsData.promotions ?? []);
  }

  useEffect(() => { void Promise.resolve().then(load); }, []);

  function resetForm() {
    setEditing(null); setProductId(""); setPromotionalPrice(""); setType("fixed"); setKind("temporal_offer"); setStartsAt(""); setEndsAt("");
  }

  function editPromotion(promotion: Promotion) {
    setEditing(promotion); setProductId(promotion.productId); setPromotionalPrice(String(promotion.promotionalPrice)); setType(promotion.type); setKind(promotion.kind ?? "temporal_offer"); setStartsAt(dateInput(promotion.startsAt)); setEndsAt(dateInput(promotion.endsAt)); setMessage("");
  }

  async function savePromotion(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setMessage("");
    const payload = { productId, promotionalPrice: Number(promotionalPrice), type, kind, startsAt, endsAt };
    const response = await fetch(editing ? `/api/admin/promotions/${editing._id}` : "/api/admin/promotions", { method: editing ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const data = await response.json();
    if (!response.ok) { setMessage(data.message ?? "No se pudo guardar la promoción"); return; }
    setMessage(editing ? "Promoción actualizada." : "Promoción creada con datos reales."); resetForm(); void load();
  }

  async function updateStatus(id: string, action: "activate" | "pause" | "cancel") {
    setMessage("");
    const response = await fetch(`/api/admin/promotions/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action }) });
    const data = await response.json();
    setMessage(response.ok ? "Estado actualizado." : data.message ?? "No se pudo actualizar el estado");
    if (response.ok) void load();
  }

  const visible = filter === "all" ? promotions : promotions.filter((promotion) => promotion.status === filter);
  const counts = Object.fromEntries(["active", "scheduled", "expired", "paused"].map((status) => [status, promotions.filter((promotion) => promotion.status === status).length]));
  const selectedProduct = products.find((product) => product._id === productId);
  const previewDiscount = selectedProduct && Number(promotionalPrice) > 0 && Number(promotionalPrice) < selectedProduct.price ? Math.round(((selectedProduct.price - Number(promotionalPrice)) / selectedProduct.price) * 10000) / 100 : null;

  return (
    <main className="min-h-screen bg-neutral-50 px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between"><div><p className="text-sm font-medium uppercase tracking-[0.3em] text-neutral-500">Promociones</p><h1 className="mt-2 text-3xl font-semibold text-neutral-950">Ofertas reales</h1><p className="mt-2 text-sm text-neutral-600">Administrá precios promocionales sin modificar el precio normal del producto.</p></div><Link href="/admin" className="rounded-full border border-neutral-200 bg-white px-4 py-2 text-sm font-semibold text-neutral-900">Volver al panel</Link></div>
        <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{[["active", "Activas"], ["scheduled", "Programadas"], ["expired", "Vencidas"], ["paused", "Pausadas"]].map(([status, label]) => <button key={status} type="button" onClick={() => setFilter(status as Filter)} className="rounded-2xl border border-neutral-200 bg-white p-4 text-left shadow-sm"><span className="text-xs uppercase tracking-wider text-neutral-500">{label}</span><strong className="mt-1 block text-2xl text-neutral-950">{counts[status]}</strong></button>)}</div>
        <form onSubmit={savePromotion} className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm"><div className="mb-5 flex items-center justify-between gap-3"><div><h2 className="text-xl font-semibold text-neutral-950">{editing ? "Editar promoción" : "Crear promoción"}</h2><p className="mt-1 text-sm text-neutral-500">La referencia se toma del precio real actual del producto.</p></div>{editing ? <button type="button" onClick={resetForm} className="rounded-xl border border-neutral-300 px-3 py-2 text-sm font-semibold">Cancelar edición</button> : null}</div><div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3"><label className="text-sm font-semibold text-neutral-700">Producto<select required disabled={Boolean(editing)} value={productId} onChange={(event) => setProductId(event.target.value)} className="mt-2 w-full rounded-xl border border-neutral-300 px-3 py-2 font-normal"><option value="">Seleccionar producto real</option>{products.filter((product) => product.active !== false).map((product) => <option key={product._id} value={product._id}>{product.title ?? product.name} · {money(product.price)}</option>)}</select></label><label className="text-sm font-semibold text-neutral-700">Precio promocional<input required min="0.01" step="0.01" type="number" value={promotionalPrice} onChange={(event) => setPromotionalPrice(event.target.value)} className="mt-2 w-full rounded-xl border border-neutral-300 px-3 py-2 font-normal" /></label><label className="text-sm font-semibold text-neutral-700">Clase<select value={kind} onChange={(event) => setKind(event.target.value)} className="mt-2 w-full rounded-xl border border-neutral-300 px-3 py-2 font-normal"><option value="temporal_offer">Oferta temporal</option><option value="flash_sale">Flash Sale</option><option value="daily_offer">Oferta del día</option></select></label><label className="text-sm font-semibold text-neutral-700">Cálculo<select value={type} onChange={(event) => setType(event.target.value)} className="mt-2 w-full rounded-xl border border-neutral-300 px-3 py-2 font-normal"><option value="fixed">Precio fijo</option><option value="percentage">Porcentaje calculado</option></select></label><label className="text-sm font-semibold text-neutral-700">Inicio<input required type="datetime-local" value={startsAt} onChange={(event) => setStartsAt(event.target.value)} className="mt-2 w-full rounded-xl border border-neutral-300 px-3 py-2 font-normal" /></label><label className="text-sm font-semibold text-neutral-700">Vencimiento<input required type="datetime-local" value={endsAt} onChange={(event) => setEndsAt(event.target.value)} className="mt-2 w-full rounded-xl border border-neutral-300 px-3 py-2 font-normal" /></label></div><p className="mt-4 text-xs text-neutral-500">El descuento se calcula contra el precio real de referencia y no se permite crear un precio anterior artificial.</p>{previewDiscount !== null ? <p className="mt-2 text-sm font-semibold text-neutral-700">Descuento calculado: {previewDiscount}%</p> : null}{message ? <p className="mt-4 text-sm font-semibold text-neutral-700" role="status">{message}</p> : null}<button type="submit" className="mt-5 rounded-xl bg-neutral-950 px-4 py-3 text-sm font-semibold text-white">{editing ? "Guardar cambios" : "Crear promoción"}</button></form>
        <div className="mt-8 overflow-x-auto rounded-3xl border border-neutral-200 bg-white shadow-sm"><div className="flex min-w-[900px] items-center gap-2 border-b border-neutral-200 p-4">{(["all", "active", "scheduled", "expired", "paused", "cancelled"] as Filter[]).map((value) => <button key={value} type="button" onClick={() => setFilter(value)} className={`rounded-full px-3 py-2 text-xs font-semibold ${filter === value ? "bg-neutral-950 text-white" : "bg-neutral-100 text-neutral-600"}`}>{value === "all" ? "Todas" : value}</button>)}</div><table className="w-full min-w-[1100px] text-left text-sm"><thead className="border-b border-neutral-200 text-xs uppercase tracking-wider text-neutral-500"><tr><th className="p-4">Producto</th><th className="p-4">Tipo</th><th className="p-4">Referencia</th><th className="p-4">Promoción</th><th className="p-4">Descuento</th><th className="p-4">Inicio / vencimiento</th><th className="p-4">Estado</th><th className="p-4">Acciones</th></tr></thead><tbody>{visible.map((promotion) => <tr key={promotion._id} className="border-b border-neutral-100"><td className="p-4 font-semibold">{promotion.product?.title ?? promotion.product?.name ?? promotion.productId}</td><td className="p-4">{kindLabel(promotion.kind)}</td><td className="p-4">{money(promotion.basePrice)}</td><td className="p-4">{money(promotion.promotionalPrice)}</td><td className="p-4">{promotion.discountPercent}%</td><td className="p-4 text-xs text-neutral-600">{dateLabel(promotion.startsAt)}<br />{dateLabel(promotion.endsAt)}</td><td className="p-4 font-semibold">{promotion.status}</td><td className="p-4"><div className="flex flex-wrap gap-2">{["draft", "scheduled", "paused"].includes(promotion.status) ? <button type="button" onClick={() => void updateStatus(promotion._id, "activate")} className="rounded-lg bg-neutral-950 px-2 py-1 text-xs font-semibold text-white">Activar</button> : null}{promotion.status === "active" ? <button type="button" onClick={() => void updateStatus(promotion._id, "pause")} className="rounded-lg border border-neutral-300 px-2 py-1 text-xs font-semibold">Pausar</button> : null}{!["expired", "cancelled"].includes(promotion.status) ? <button type="button" onClick={() => void updateStatus(promotion._id, "cancel")} className="rounded-lg border border-red-200 px-2 py-1 text-xs font-semibold text-red-700">Cancelar</button> : null}{!["expired", "cancelled"].includes(promotion.status) ? <button type="button" onClick={() => editPromotion(promotion)} className="rounded-lg border border-neutral-300 px-2 py-1 text-xs font-semibold">Editar</button> : null}</div></td></tr>)}{visible.length === 0 ? <tr><td colSpan={8} className="p-8 text-center text-neutral-500">No hay promociones en este estado.</td></tr> : null}</tbody></table></div>
      </div>
    </main>
  );
}

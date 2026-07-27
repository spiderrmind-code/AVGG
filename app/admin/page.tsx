"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { calculateRecommendedPrice, estimateProfit } from "@/lib/pricing";

interface ProductItem {
  _id: string;
  name?: string;
  title?: string;
  price: number;
  costPrice?: number;
  category?: string;
  stock?: boolean;
  active?: boolean;
  supplier?: string;
  shippingDays?: string;
  image?: string;
  description?: string;
  sku?: string;
  margin?: number;
  supplierLink?: string;
}

interface OrderItem {
  _id: string;
  orderNumber: string;
  paymentStatus?: string;
  status?: string;
  total: number;
  createdAt?: string;
}

export default function AdminPage() {
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [name, setName] = useState("");
  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const [costPrice, setCostPrice] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [image, setImage] = useState("");
  const [supplier, setSupplier] = useState("");
  const [shippingDays, setShippingDays] = useState("");
  const [sku, setSku] = useState("");
  const [margin, setMargin] = useState("");
  const [supplierLink, setSupplierLink] = useState("");
  const [stock, setStock] = useState(true);
  const [active, setActive] = useState(true);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [orderStatuses, setOrderStatuses] = useState<Record<string, string>>({});
  const [stats, setStats] = useState({ totalSales: 0, orderCount: 0, estimatedProfit: 0, activeProducts: 0, activeSuppliers: 0, stockAlerts: 0 });
  const [costPriceInput, setCostPriceInput] = useState("20000");
  const [shippingCostInput, setShippingCostInput] = useState("2000");
  const [commissionInput, setCommissionInput] = useState("3000");
  const [otherCostsInput, setOtherCostsInput] = useState("0");
  const [marginInput, setMarginInput] = useState("40");

  const resetForm = () => {
    setName("");
    setTitle("");
    setPrice("");
    setCostPrice("");
    setCategory("");
    setDescription("");
    setImage("");
    setSupplier("");
    setShippingDays("");
    setSku("");
    setMargin("");
    setSupplierLink("");
    setStock(true);
    setActive(true);
    setEditingProductId(null);
  };

  const loadData = async () => {
    try {
      const [productsRes, ordersRes, dashboardRes] = await Promise.all([fetch("/api/admin/products"), fetch("/api/admin/orders"), fetch("/api/admin/dashboard")]);
      const productsData = await productsRes.json();
      const ordersData = await ordersRes.json();
      const dashboardData = await dashboardRes.json();
      setProducts(productsData.products ?? []);
      setOrders(ordersData.orders ?? []);
      setStats(dashboardData.stats ?? { totalSales: 0, orderCount: 0, estimatedProfit: 0, activeProducts: 0, activeSuppliers: 0, stockAlerts: 0 });
      setOrderStatuses(Object.fromEntries((ordersData.orders ?? []).map((order: OrderItem) => [String(order._id), order.status ?? order.paymentStatus ?? "pending"])));
    } catch {
      setMessage("No se pudo cargar la administración");
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const saveProduct = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      const payload = {
        name,
        title: title || name,
        description,
        shortDescription: description,
        price: Number(price),
        costPrice: Number(costPrice) || Number(price),
        category,
        image,
        supplier,
        shippingDays: shippingDays || "24-48 hs",
        stock,
        active,
        sku: sku || `SKU-${Date.now()}`,
        margin: Number(margin) || 0,
        supplierLink,
      };

      const response = await fetch(editingProductId ? `/api/admin/products/${editingProductId}` : "/api/admin/products", {
        method: editingProductId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      setMessage(data.message || (editingProductId ? "Producto actualizado" : "Producto creado"));
      resetForm();
      await loadData();
    } catch {
      setMessage("Error guardando producto");
    }
  };

  const selectProduct = (product: ProductItem) => {
    setEditingProductId(String(product._id));
    setName(product.name ?? product.title ?? "");
    setTitle(product.title ?? product.name ?? "");
    setPrice(String(product.price ?? ""));
    setCostPrice(String(product.costPrice ?? product.price ?? ""));
    setCategory(product.category ?? "");
    setDescription(product.description ?? "");
    setImage(product.image ?? "");
    setSupplier(product.supplier ?? "");
    setShippingDays(product.shippingDays ?? "24-48 hs");
    setSku(product.sku ?? "");
    setMargin(String(product.margin ?? ""));
    setSupplierLink(product.supplierLink ?? "");
    setStock(product.stock ?? true);
    setActive(product.active ?? true);
  };

  const updateOrderStatus = async (orderId: string, status: string) => {
    try {
      const response = await fetch("/api/admin/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: orderId, status }),
      });
      const data = await response.json();
      if (data.success) {
        setOrderStatuses((prev) => ({ ...prev, [orderId]: status }));
        setMessage("Estado del pedido actualizado");
      }
    } catch {
      setMessage("No se pudo actualizar el pedido");
    }
  };

  const statCards = useMemo(() => [
    { label: "Ventas totales", value: `$${stats.totalSales.toLocaleString("es-AR")}` },
    { label: "Pedidos", value: stats.orderCount.toString() },
    { label: "Ganancias estimadas", value: `$${stats.estimatedProfit.toLocaleString("es-AR")}` },
    { label: "Productos activos", value: stats.activeProducts.toString() },
    { label: "Proveedores activos", value: stats.activeSuppliers.toString() },
    { label: "Alertas de stock", value: stats.stockAlerts.toString() },
  ], [stats]);

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
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(255,47,146,0.12),_transparent_35%),linear-gradient(180deg,_#f7f2ea_0%,_#efe7dd_100%)] px-4 py-10 sm:px-6 lg:px-8 dark:bg-[radial-gradient(circle_at_top_left,_rgba(255,47,146,0.16),_transparent_30%),linear-gradient(180deg,_#07080d_0%,_#0d1018_100%)]">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-col gap-4 rounded-[2.2rem] border border-white/70 bg-white/80 p-6 shadow-[0_24px_90px_rgba(0,0,0,0.08)] backdrop-blur-xl lg:flex-row lg:items-center lg:justify-between lg:p-8 dark:border-white/10 dark:bg-zinc-900/70 dark:shadow-[0_24px_90px_rgba(0,0,0,0.3)]">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-neutral-500 dark:text-zinc-400">AVG CONNECTS</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-[-0.02em] text-neutral-950 dark:text-white">Panel de operaciones</h1>
            <p className="mt-2 text-sm text-neutral-600 dark:text-zinc-300">Centro de control para ventas, proveedores, productos y fulfillment.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/admin/suppliers" className="rounded-full border border-neutral-200 bg-white/80 px-4 py-2 text-sm font-semibold text-neutral-900 transition hover:bg-neutral-50 dark:border-white/10 dark:bg-white/10 dark:text-zinc-100 dark:hover:bg-white/15">🏭 Proveedores</Link>
            <Link href="/admin/inventory" className="rounded-full border border-neutral-200 bg-white/80 px-4 py-2 text-sm font-semibold text-neutral-900 transition hover:bg-neutral-50 dark:border-white/10 dark:bg-white/10 dark:text-zinc-100 dark:hover:bg-white/15">📦 Inventario</Link>
            <Link href="/admin/pricing" className="rounded-full border border-neutral-200 bg-white/80 px-4 py-2 text-sm font-semibold text-neutral-900 transition hover:bg-neutral-50 dark:border-white/10 dark:bg-white/10 dark:text-zinc-100 dark:hover:bg-white/15">📈 Pricing</Link>
            <Link href="/admin/offers" className="rounded-full border border-neutral-200 bg-white/80 px-4 py-2 text-sm font-semibold text-neutral-900 transition hover:bg-neutral-50 dark:border-white/10 dark:bg-white/10 dark:text-zinc-100 dark:hover:bg-white/15">🔥 Ofertas</Link>
            <Link href="/admin/operations" className="rounded-full border border-neutral-200 bg-white/80 px-4 py-2 text-sm font-semibold text-neutral-900 transition hover:bg-neutral-50 dark:border-white/10 dark:bg-white/10 dark:text-zinc-100 dark:hover:bg-white/15">📋 Operaciones</Link>
            <Link href="/admin/integrations" className="rounded-full border border-neutral-200 bg-white/80 px-4 py-2 text-sm font-semibold text-neutral-900 transition hover:bg-neutral-50 dark:border-white/10 dark:bg-white/10 dark:text-zinc-100 dark:hover:bg-white/15">🔌 Integraciones</Link>
            <Link href="/" className="rounded-full bg-neutral-950 px-4 py-2 text-sm font-semibold text-white shadow-[0_12px_30px_rgba(0,0,0,0.16)] transition hover:-translate-y-0.5 hover:bg-neutral-800 dark:bg-white dark:text-neutral-950 dark:hover:bg-zinc-100">Tienda</Link>
          </div>
        </div>

        {message ? <div className="mb-6 rounded-[1.4rem] border border-black/10 bg-white/80 p-4 text-sm text-neutral-700 shadow-[0_10px_30px_rgba(0,0,0,0.05)] backdrop-blur-xl dark:border-white/10 dark:bg-white/10 dark:text-zinc-200">{message}</div> : null}

        <div className="mb-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {statCards.map((card) => (
            <div key={card.label} className="rounded-[1.6rem] border border-black/10 bg-white/80 p-5 shadow-[0_16px_50px_rgba(0,0,0,0.05)] backdrop-blur-xl dark:border-white/10 dark:bg-zinc-900/70 dark:shadow-[0_16px_50px_rgba(0,0,0,0.24)]">
              <p className="text-sm text-neutral-600 dark:text-zinc-400">{card.label}</p>
              <p className="mt-3 text-2xl font-semibold text-neutral-950 dark:text-white">{card.value}</p>
            </div>
          ))}
        </div>

        <div className="mb-8 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <section className="rounded-[2rem] border border-white/70 bg-white/80 p-6 shadow-[0_20px_80px_rgba(0,0,0,0.06)] backdrop-blur-xl dark:border-white/10 dark:bg-zinc-900/70 dark:shadow-[0_20px_80px_rgba(0,0,0,0.25)]">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold dark:text-white">Motor de precios</h2>
                <p className="mt-1 text-sm text-neutral-600 dark:text-zinc-400">Calcula el precio recomendado para cada producto con base en costos reales.</p>
              </div>
            </div>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <input className="w-full rounded-xl border border-neutral-300 bg-white/80 px-3 py-2 text-sm text-neutral-950 outline-none transition focus:border-neutral-400 focus:ring-2 focus:ring-neutral-200 dark:border-white/10 dark:bg-white/10 dark:text-white dark:placeholder:text-zinc-400 dark:focus:border-white/20 dark:focus:ring-white/10" placeholder="Costo proveedor" type="number" value={costPriceInput} onChange={(event) => setCostPriceInput(event.target.value)} />
              <input className="w-full rounded-xl border border-neutral-300 bg-white/80 px-3 py-2 text-sm text-neutral-950 outline-none transition focus:border-neutral-400 focus:ring-2 focus:ring-neutral-200 dark:border-white/10 dark:bg-white/10 dark:text-white dark:placeholder:text-zinc-400 dark:focus:border-white/20 dark:focus:ring-white/10" placeholder="Envío" type="number" value={shippingCostInput} onChange={(event) => setShippingCostInput(event.target.value)} />
              <input className="w-full rounded-xl border border-neutral-300 bg-white/80 px-3 py-2 text-sm text-neutral-950 outline-none transition focus:border-neutral-400 focus:ring-2 focus:ring-neutral-200 dark:border-white/10 dark:bg-white/10 dark:text-white dark:placeholder:text-zinc-400 dark:focus:border-white/20 dark:focus:ring-white/10" placeholder="Comisión MP" type="number" value={commissionInput} onChange={(event) => setCommissionInput(event.target.value)} />
              <input className="w-full rounded-xl border border-neutral-300 bg-white/80 px-3 py-2 text-sm text-neutral-950 outline-none transition focus:border-neutral-400 focus:ring-2 focus:ring-neutral-200 dark:border-white/10 dark:bg-white/10 dark:text-white dark:placeholder:text-zinc-400 dark:focus:border-white/20 dark:focus:ring-white/10" placeholder="Otros costos" type="number" value={otherCostsInput} onChange={(event) => setOtherCostsInput(event.target.value)} />
            </div>
            <div className="mt-4">
              <label className="text-sm font-medium text-neutral-700 dark:text-zinc-300">Margen deseado (%)</label>
              <input className="mt-2 w-full rounded-xl border border-neutral-300 bg-white/80 px-3 py-2 text-sm text-neutral-950 outline-none transition focus:border-neutral-400 focus:ring-2 focus:ring-neutral-200 dark:border-white/10 dark:bg-white/10 dark:text-white dark:placeholder:text-zinc-400 dark:focus:border-white/20 dark:focus:ring-white/10" placeholder="Margen (%)" type="number" value={marginInput} onChange={(event) => setMarginInput(event.target.value)} />
            </div>
            <div className="mt-6 rounded-2xl bg-neutral-950 p-5 text-white dark:bg-white dark:text-neutral-950">
              <p className="text-sm text-neutral-400 dark:text-neutral-600">Precio recomendado</p>
              <p className="mt-2 text-3xl font-semibold">${pricingSummary.recommended.recommendedPrice.toLocaleString("es-AR")}</p>
              <div className="mt-4 grid gap-3 text-sm text-neutral-300 sm:grid-cols-2 dark:text-neutral-700">
                <div>Costos totales: ${pricingSummary.recommended.totalCosts.toLocaleString("es-AR")}</div>
                <div>Ganancia estimada: ${pricingSummary.profit.profit.toLocaleString("es-AR")}</div>
              </div>
            </div>
          </section>

          <section className="rounded-[2rem] border border-white/70 bg-white/80 p-6 shadow-[0_20px_80px_rgba(0,0,0,0.06)] backdrop-blur-xl dark:border-white/10 dark:bg-zinc-900/70 dark:shadow-[0_20px_80px_rgba(0,0,0,0.25)]">
            <h2 className="text-xl font-semibold text-neutral-950 dark:text-white">Carga rápida de producto</h2>
            <p className="mt-1 text-sm text-neutral-600 dark:text-zinc-400">Registra el producto con su proveedor, costos internos y stock de abastecimiento.</p>
            <form onSubmit={saveProduct} className="mt-6 space-y-4">
              <input className="w-full rounded-2xl border border-neutral-200 bg-white/80 px-3 py-3 text-sm text-neutral-950 outline-none transition focus:border-neutral-300 focus:ring-2 focus:ring-neutral-200 dark:border-white/10 dark:bg-white/10 dark:text-white dark:placeholder:text-zinc-400 dark:focus:border-white/20 dark:focus:ring-white/10" placeholder="Nombre comercial" value={name} onChange={(event) => setName(event.target.value)} required />
              <input className="w-full rounded-2xl border border-neutral-200 bg-white/80 px-3 py-3 text-sm text-neutral-950 outline-none transition focus:border-neutral-300 focus:ring-2 focus:ring-neutral-200 dark:border-white/10 dark:bg-white/10 dark:text-white dark:placeholder:text-zinc-400 dark:focus:border-white/20 dark:focus:ring-white/10" placeholder="Título vendedor (opcional)" value={title} onChange={(event) => setTitle(event.target.value)} />
              <textarea className="w-full rounded-2xl border border-neutral-200 bg-white/80 px-3 py-3 text-sm text-neutral-950 outline-none transition focus:border-neutral-300 focus:ring-2 focus:ring-neutral-200 dark:border-white/10 dark:bg-white/10 dark:text-white dark:placeholder:text-zinc-400 dark:focus:border-white/20 dark:focus:ring-white/10" placeholder="Descripción comercial" value={description} onChange={(event) => setDescription(event.target.value)} />
              <div className="grid gap-4 md:grid-cols-2">
                <input className="w-full rounded-2xl border border-neutral-200 bg-white/80 px-3 py-3 text-sm text-neutral-950 outline-none transition focus:border-neutral-300 focus:ring-2 focus:ring-neutral-200 dark:border-white/10 dark:bg-white/10 dark:text-white dark:placeholder:text-zinc-400 dark:focus:border-white/20 dark:focus:ring-white/10" placeholder="Precio de venta" type="number" value={price} onChange={(event) => setPrice(event.target.value)} required />
                <input className="w-full rounded-2xl border border-neutral-200 bg-white/80 px-3 py-3 text-sm text-neutral-950 outline-none transition focus:border-neutral-300 focus:ring-2 focus:ring-neutral-200 dark:border-white/10 dark:bg-white/10 dark:text-white dark:placeholder:text-zinc-400 dark:focus:border-white/20 dark:focus:ring-white/10" placeholder="Costo proveedor" type="number" value={costPrice} onChange={(event) => setCostPrice(event.target.value)} />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <input className="w-full rounded-2xl border border-neutral-200 bg-white/80 px-3 py-3 text-sm text-neutral-950 outline-none transition focus:border-neutral-300 focus:ring-2 focus:ring-neutral-200 dark:border-white/10 dark:bg-white/10 dark:text-white dark:placeholder:text-zinc-400 dark:focus:border-white/20 dark:focus:ring-white/10" placeholder="SKU" value={sku} onChange={(event) => setSku(event.target.value)} />
                <input className="w-full rounded-2xl border border-neutral-200 bg-white/80 px-3 py-3 text-sm text-neutral-950 outline-none transition focus:border-neutral-300 focus:ring-2 focus:ring-neutral-200 dark:border-white/10 dark:bg-white/10 dark:text-white dark:placeholder:text-zinc-400 dark:focus:border-white/20 dark:focus:ring-white/10" placeholder="Margen %" type="number" value={margin} onChange={(event) => setMargin(event.target.value)} />
              </div>
              <input className="w-full rounded-2xl border border-neutral-200 bg-white/80 px-3 py-3 text-sm text-neutral-950 outline-none transition focus:border-neutral-300 focus:ring-2 focus:ring-neutral-200 dark:border-white/10 dark:bg-white/10 dark:text-white dark:placeholder:text-zinc-400 dark:focus:border-white/20 dark:focus:ring-white/10" placeholder="Categoría" value={category} onChange={(event) => setCategory(event.target.value)} />
              <input className="w-full rounded-2xl border border-neutral-200 bg-white/80 px-3 py-3 text-sm text-neutral-950 outline-none transition focus:border-neutral-300 focus:ring-2 focus:ring-neutral-200 dark:border-white/10 dark:bg-white/10 dark:text-white dark:placeholder:text-zinc-400 dark:focus:border-white/20 dark:focus:ring-white/10" placeholder="Proveedor" value={supplier} onChange={(event) => setSupplier(event.target.value)} />
              <input className="w-full rounded-2xl border border-neutral-200 bg-white/80 px-3 py-3 text-sm text-neutral-950 outline-none transition focus:border-neutral-300 focus:ring-2 focus:ring-neutral-200 dark:border-white/10 dark:bg-white/10 dark:text-white dark:placeholder:text-zinc-400 dark:focus:border-white/20 dark:focus:ring-white/10" placeholder="Link proveedor" value={supplierLink} onChange={(event) => setSupplierLink(event.target.value)} />
              <input className="w-full rounded-2xl border border-neutral-200 bg-white/80 px-3 py-3 text-sm text-neutral-950 outline-none transition focus:border-neutral-300 focus:ring-2 focus:ring-neutral-200 dark:border-white/10 dark:bg-white/10 dark:text-white dark:placeholder:text-zinc-400 dark:focus:border-white/20 dark:focus:ring-white/10" placeholder="Tiempo de envío" value={shippingDays} onChange={(event) => setShippingDays(event.target.value)} />
              <input className="w-full rounded-2xl border border-neutral-200 bg-white/80 px-3 py-3 text-sm text-neutral-950 outline-none transition focus:border-neutral-300 focus:ring-2 focus:ring-neutral-200 dark:border-white/10 dark:bg-white/10 dark:text-white dark:placeholder:text-zinc-400 dark:focus:border-white/20 dark:focus:ring-white/10" placeholder="Imagen" value={image} onChange={(event) => setImage(event.target.value)} />
              <label className="flex items-center gap-2 text-sm text-neutral-700 dark:text-zinc-300">
                <input type="checkbox" checked={stock} onChange={(event) => setStock(event.target.checked)} />
                Disponible para vender
              </label>
              <label className="flex items-center gap-2 text-sm text-neutral-700 dark:text-zinc-300">
                <input type="checkbox" checked={active} onChange={(event) => setActive(event.target.checked)} />
                Producto activo
              </label>
              <div className="flex gap-3">
                <button className="flex-1 rounded-full bg-neutral-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-neutral-800 dark:bg-white dark:text-neutral-950 dark:hover:bg-zinc-100">{editingProductId ? "Actualizar producto" : "Guardar producto"}</button>
                {editingProductId ? <button type="button" onClick={resetForm} className="rounded-full border border-neutral-200 bg-white/80 px-4 py-3 text-sm font-semibold text-neutral-900 transition hover:bg-neutral-50 dark:border-white/10 dark:bg-white/10 dark:text-zinc-100 dark:hover:bg-white/15">Cancelar</button> : null}
              </div>
            </form>
          </section>
        </div>

        <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
          <section className="rounded-[2rem] border border-white/70 bg-white/80 p-6 shadow-[0_20px_80px_rgba(0,0,0,0.06)] backdrop-blur-xl dark:border-white/10 dark:bg-zinc-900/70 dark:shadow-[0_20px_80px_rgba(0,0,0,0.25)]">
            <h2 className="text-xl font-semibold dark:text-white">{editingProductId ? "Editar producto" : "Crear producto"}</h2>
            <form onSubmit={saveProduct} className="mt-6 space-y-4">
              <input className="w-full rounded-xl border border-neutral-300 px-3 py-2" placeholder="Nombre comercial" value={name} onChange={(event) => setName(event.target.value)} required />
              <input className="w-full rounded-xl border border-neutral-300 px-3 py-2" placeholder="Título vendedor (opcional)" value={title} onChange={(event) => setTitle(event.target.value)} />
              <textarea className="w-full rounded-xl border border-neutral-300 px-3 py-2" placeholder="Descripción comercial" value={description} onChange={(event) => setDescription(event.target.value)} />
              <div className="grid gap-4 md:grid-cols-2">
                <input className="w-full rounded-xl border border-neutral-300 px-3 py-2" placeholder="Precio de venta" type="number" value={price} onChange={(event) => setPrice(event.target.value)} required />
                <input className="w-full rounded-xl border border-neutral-300 px-3 py-2" placeholder="Costo proveedor" type="number" value={costPrice} onChange={(event) => setCostPrice(event.target.value)} />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <input className="w-full rounded-xl border border-neutral-300 px-3 py-2" placeholder="SKU" value={sku} onChange={(event) => setSku(event.target.value)} />
                <input className="w-full rounded-xl border border-neutral-300 px-3 py-2" placeholder="Margen %" type="number" value={margin} onChange={(event) => setMargin(event.target.value)} />
              </div>
              <input className="w-full rounded-xl border border-neutral-300 px-3 py-2" placeholder="Categoría" value={category} onChange={(event) => setCategory(event.target.value)} />
              <input className="w-full rounded-xl border border-neutral-300 px-3 py-2" placeholder="Proveedor" value={supplier} onChange={(event) => setSupplier(event.target.value)} />
              <input className="w-full rounded-xl border border-neutral-300 px-3 py-2" placeholder="Link proveedor" value={supplierLink} onChange={(event) => setSupplierLink(event.target.value)} />
              <input className="w-full rounded-xl border border-neutral-300 px-3 py-2" placeholder="Tiempo de envío" value={shippingDays} onChange={(event) => setShippingDays(event.target.value)} />
              <input className="w-full rounded-xl border border-neutral-300 px-3 py-2" placeholder="Imagen" value={image} onChange={(event) => setImage(event.target.value)} />
              <label className="flex items-center gap-2 text-sm text-neutral-700">
                <input type="checkbox" checked={stock} onChange={(event) => setStock(event.target.checked)} />
                Disponible para vender
              </label>
              <label className="flex items-center gap-2 text-sm text-neutral-700">
                <input type="checkbox" checked={active} onChange={(event) => setActive(event.target.checked)} />
                Producto activo
              </label>
              <div className="flex gap-3">
                <button className="flex-1 rounded-xl bg-black px-4 py-3 text-sm font-semibold text-white">{editingProductId ? "Actualizar producto" : "Guardar producto"}</button>
                {editingProductId ? <button type="button" onClick={resetForm} className="rounded-xl border border-neutral-300 px-4 py-3 text-sm font-semibold text-neutral-900">Cancelar</button> : null}
              </div>
            </form>
          </section>

          <section className="rounded-[2rem] border border-white/70 bg-white/80 p-6 shadow-[0_20px_80px_rgba(0,0,0,0.06)] backdrop-blur-xl dark:border-white/10 dark:bg-zinc-900/70 dark:shadow-[0_20px_80px_rgba(0,0,0,0.25)]">
            <h2 className="text-xl font-semibold text-neutral-950 dark:text-white">Productos</h2>
            <div className="mt-4 space-y-3">
              {products.map((product) => (
                <div key={product._id} className="flex flex-col gap-3 rounded-[1.3rem] border border-white/70 bg-white/80 p-3 shadow-[0_10px_30px_rgba(0,0,0,0.04)] sm:flex-row sm:items-center sm:justify-between dark:border-white/10 dark:bg-white/10">
                  <div>
                    <p className="font-semibold text-neutral-950">{product.title ?? product.name ?? "Producto"}</p>
                    <p className="text-sm text-neutral-600">{product.category ?? "Sin categoría"} • ${product.price}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-neutral-500">{product.stock ? "En stock" : "Sin stock"}</span>
                    <button type="button" onClick={() => selectProduct(product)} className="rounded-full border border-neutral-200 bg-white/80 px-3 py-1 text-sm font-semibold text-neutral-900 transition hover:bg-neutral-50">Editar</button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        <section className="mt-8 rounded-[2rem] border border-white/70 bg-white/80 p-6 shadow-[0_20px_80px_rgba(0,0,0,0.06)] backdrop-blur-xl dark:border-white/10 dark:bg-zinc-900/70 dark:shadow-[0_20px_80px_rgba(0,0,0,0.25)]">
          <h2 className="text-xl font-semibold text-neutral-950 dark:text-white">Pedidos</h2>
          <div className="mt-4 space-y-3">
            {orders.map((order) => (
              <div key={order._id} className="flex flex-col gap-3 rounded-[1.3rem] border border-white/70 bg-white/80 p-3 shadow-[0_10px_30px_rgba(0,0,0,0.04)] sm:flex-row sm:items-center sm:justify-between dark:border-white/10 dark:bg-white/10">
                <div>
                  <p className="font-semibold text-neutral-950">{order.orderNumber}</p>
                  <p className="text-sm text-neutral-600">{order.createdAt ? new Date(order.createdAt).toLocaleString("es-AR") : "Reciente"}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-neutral-950">${order.total}</p>
                  <select value={orderStatuses[String(order._id)] ?? order.status ?? order.paymentStatus ?? "pending"} onChange={(event) => updateOrderStatus(String(order._id), event.target.value)} className="mt-2 rounded-full border border-neutral-200 bg-white/80 px-3 py-2 text-sm outline-none">
                    <option value="pending">Pendiente pago</option>
                    <option value="paid">Pagado</option>
                    <option value="processing">Preparando</option>
                    <option value="shipped">Enviado</option>
                    <option value="delivered">Entregado</option>
                    <option value="cancelled">Cancelado</option>
                  </select>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}

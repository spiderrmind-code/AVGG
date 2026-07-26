"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

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
      const [productsRes, ordersRes] = await Promise.all([fetch("/api/admin/products"), fetch("/api/admin/orders")]);
      const productsData = await productsRes.json();
      const ordersData = await ordersRes.json();
      setProducts(productsData.products ?? []);
      setOrders(ordersData.orders ?? []);
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

  return (
    <main className="min-h-screen bg-neutral-50 px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-semibold">Panel admin</h1>
            <p className="mt-2 text-sm text-neutral-600">Gestión básica de productos y pedidos.</p>
          </div>
          <Link href="/" className="text-sm font-semibold text-black">Volver a la tienda</Link>
        </div>

        {message ? <div className="mb-6 rounded-xl border border-neutral-200 bg-white p-4 text-sm text-neutral-700">{message}</div> : null}

        <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
          <section className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold">{editingProductId ? "Editar producto" : "Crear producto"}</h2>
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

          <section className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold">Productos</h2>
            <div className="mt-4 space-y-3">
              {products.map((product) => (
                <div key={product._id} className="flex items-center justify-between rounded-xl border border-neutral-200 p-3">
                  <div>
                    <p className="font-semibold">{product.title ?? product.name ?? "Producto"}</p>
                    <p className="text-sm text-neutral-600">{product.category ?? "Sin categoría"} • ${product.price}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-neutral-500">{product.stock ? "En stock" : "Sin stock"}</span>
                    <button type="button" onClick={() => selectProduct(product)} className="rounded-lg border border-neutral-300 px-3 py-1 text-sm font-semibold text-neutral-900">Editar</button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        <section className="mt-8 rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold">Pedidos</h2>
          <div className="mt-4 space-y-3">
            {orders.map((order) => (
              <div key={order._id} className="flex flex-col gap-3 rounded-xl border border-neutral-200 p-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-semibold">{order.orderNumber}</p>
                  <p className="text-sm text-neutral-600">{order.createdAt ? new Date(order.createdAt).toLocaleString("es-AR") : "Reciente"}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold">${order.total}</p>
                  <select value={orderStatuses[String(order._id)] ?? order.status ?? order.paymentStatus ?? "pending"} onChange={(event) => updateOrderStatus(String(order._id), event.target.value)} className="mt-2 rounded-lg border border-neutral-300 px-3 py-2 text-sm">
                    <option value="pending">Pendiente</option>
                    <option value="paid">Pagado</option>
                    <option value="processing">Procesando</option>
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

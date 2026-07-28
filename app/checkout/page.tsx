"use client";

import { FormEvent, useMemo, useState } from "react";
import Link from "next/link";
import { useCart } from "@/context/CartContext";

const initialValues = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  address: "",
  city: "",
  province: "",
  postalCode: "",
};

export default function CheckoutPage() {
  const { cart, clearCart } = useCart();

  const [form, setForm] = useState(initialValues);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  const subtotal = useMemo(() => cart.reduce((acc, item) => acc + item.price * item.quantity, 0), [cart]);
  const total = subtotal;

  function updateField(field: keyof typeof initialValues, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function validate() {
    const nextErrors: Record<string, string> = {};
    if (!form.firstName.trim()) nextErrors.firstName = "El nombre es obligatorio";
    if (!form.lastName.trim()) nextErrors.lastName = "El apellido es obligatorio";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) nextErrors.email = "Email inválido";
    if (!form.phone.trim()) nextErrors.phone = "El teléfono es obligatorio";
    if (!form.address.trim()) nextErrors.address = "La dirección es obligatoria";
    if (!form.city.trim()) nextErrors.city = "La ciudad es obligatoria";
    if (!form.province.trim()) nextErrors.province = "La provincia es obligatoria";
    if (!form.postalCode.trim()) nextErrors.postalCode = "El código postal es obligatorio";
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!validate()) return;
    if (cart.length === 0) {
      setMessage("Tu carrito está vacío");
      return;
    }

    try {
      setIsSubmitting(true);
      setMessage("");

      const orderResponse = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customer: form, items: cart.map((item) => ({ _id: item._id, quantity: item.quantity })) }),
      });

      if (!orderResponse.ok) throw new Error("No se pudo crear la orden");

      const orderData = await orderResponse.json();
      const orderId = orderData.orderId;
      const guestAccessToken = typeof orderData.guestAccessToken === "string" ? orderData.guestAccessToken : undefined;

      if (!orderId) {
        throw new Error("No se pudo crear la orden");
      }

      const paymentResponse = await fetch("/api/mercadopago", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, ...(guestAccessToken ? { guestAccessToken } : {}) }),
      });
      const paymentData = await paymentResponse.json().catch(() => null);

      if (!paymentResponse.ok) {
        throw new Error(paymentData?.message || "No se pudo iniciar el pago");
      }

      if (typeof paymentData?.initPoint !== "string" || !paymentData.initPoint) {
        throw new Error("Mercado Pago no devolvió una URL de pago válida");
      }

      clearCart();
      window.location.href = paymentData.initPoint;
    } catch (error) {
      console.error(error);
      setMessage("No se pudo iniciar el pago. Intentá nuevamente.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(255,47,146,0.14),_transparent_35%),linear-gradient(180deg,_#f8f5ef_0%,_#f3eee7_100%)] px-4 py-10 sm:px-6 lg:px-8 dark:bg-[radial-gradient(circle_at_top_left,_rgba(255,47,146,0.16),_transparent_30%),linear-gradient(180deg,_#07080d_0%,_#0d1018_100%)]">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-col gap-3 rounded-[2rem] border border-white/70 bg-white/75 p-6 shadow-[0_24px_90px_rgba(0,0,0,0.06)] backdrop-blur-xl sm:flex-row sm:items-end sm:justify-between dark:border-white/10 dark:bg-zinc-900/70 dark:shadow-[0_24px_90px_rgba(0,0,0,0.3)]">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-neutral-500 dark:text-zinc-400">Checkout</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-[-0.02em] text-neutral-950 dark:text-white">Finalizar compra</h1>
            <p className="mt-2 text-neutral-600 dark:text-zinc-300">Completá tus datos con una experiencia de pago limpia, rápida y confiable.</p>
          </div>
          <div className="rounded-full border border-black/10 bg-white/80 px-3 py-2 text-sm text-neutral-700 dark:border-white/10 dark:bg-white/10 dark:text-zinc-200">Pago protegido</div>
        </div>

        <div className="mt-2 grid gap-8 lg:grid-cols-[1fr_380px]">
          <form onSubmit={handleSubmit} className="space-y-6 rounded-[2rem] border border-white/70 bg-white/80 p-6 shadow-[0_24px_80px_rgba(0,0,0,0.08)] backdrop-blur-xl dark:border-white/10 dark:bg-zinc-900/70 dark:shadow-[0_24px_80px_rgba(0,0,0,0.3)]">
            <div className="rounded-[1.4rem] border border-black/10 bg-white/70 p-4 dark:border-white/10 dark:bg-white/10">
              <h2 className="text-xl font-semibold text-neutral-950 dark:text-white">Datos personales</h2>
              <p className="mt-1 text-sm text-neutral-600 dark:text-zinc-300">Tu información queda protegida y se usa solo para gestionar el pedido.</p>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              {[
                ["firstName", "Nombre"],
                ["lastName", "Apellido"],
                ["email", "Email"],
                ["phone", "Teléfono"],
              ].map(([field, label]) => (
                <div key={field}>
                  <label htmlFor={field} className="text-sm font-medium text-neutral-700">{label}</label>
                  <input id={field} type={field === "email" ? "email" : field === "phone" ? "tel" : "text"} autoComplete={field === "firstName" ? "given-name" : field === "lastName" ? "family-name" : field === "email" ? "email" : "tel"} aria-invalid={Boolean(errors[field])} aria-describedby={errors[field] ? `${field}-error` : undefined} className="premium-input mt-2" value={form[field as keyof typeof form]} onChange={(e) => updateField(field as keyof typeof initialValues, e.target.value)} />
                  {errors[field] && <p id={`${field}-error`} role="alert" className="mt-1 text-sm text-red-500">{errors[field]}</p>}
                </div>
              ))}
            </div>

            <div className="rounded-[1.4rem] border border-black/10 bg-white/70 p-4 dark:border-white/10 dark:bg-white/10">
              <h2 className="text-xl font-semibold text-neutral-950 dark:text-white">Dirección de entrega</h2>
              <p className="mt-1 text-sm text-neutral-600 dark:text-zinc-300">Toda la información se presenta de forma clara para que el proceso se sienta seguro.</p>
            </div>

            {[
              ["address", "Dirección"],
              ["city", "Ciudad"],
              ["province", "Provincia"],
              ["postalCode", "Código postal"],
            ].map(([field, label]) => (
              <div key={field}>
                <label htmlFor={field} className="text-sm font-medium text-neutral-700">{label}</label>
                <input id={field} autoComplete={field === "address" ? "street-address" : field === "city" ? "address-level2" : field === "province" ? "address-level1" : "postal-code"} aria-invalid={Boolean(errors[field])} aria-describedby={errors[field] ? `${field}-error` : undefined} className="premium-input mt-2" value={form[field as keyof typeof form]} onChange={(e) => updateField(field as keyof typeof initialValues, e.target.value)} />
                {errors[field] && <p id={`${field}-error`} role="alert" className="mt-1 text-sm text-red-500">{errors[field]}</p>}
              </div>
            ))}

            {message && <p role="alert" className="text-red-500">{message}</p>}

            <button disabled={isSubmitting} className="w-full rounded-full bg-neutral-950 py-4 text-sm font-semibold text-white shadow-[0_16px_45px_rgba(0,0,0,0.16)] transition hover:-translate-y-0.5 hover:bg-neutral-800 active:scale-[0.98] disabled:opacity-50 dark:bg-white dark:text-neutral-950 dark:hover:bg-zinc-100">
              {isSubmitting ? "Procesando..." : "Pagar con Mercado Pago / Tarjeta"}
            </button>
          </form>

          <aside className="h-fit rounded-[2rem] border border-white/70 bg-white/80 p-6 shadow-[0_24px_80px_rgba(0,0,0,0.08)] backdrop-blur-xl dark:border-white/10 dark:bg-zinc-900/70 dark:shadow-[0_24px_80px_rgba(0,0,0,0.3)]">
            <div className="rounded-[1.4rem] border border-black/10 bg-white/70 p-4 dark:border-white/10 dark:bg-white/10">
              <h2 className="text-xl font-semibold text-neutral-950 dark:text-white">Resumen</h2>
              <p className="mt-1 text-sm text-neutral-600 dark:text-zinc-300">Tu pedido se ve claro desde el primer vistazo.</p>
            </div>
            <div className="mt-5 space-y-3">
              {cart.map((item) => (
                <div key={item._id} className="flex justify-between text-sm">
                  <span>{item.name} x{item.quantity}</span>
                  <span>${(item.price * item.quantity).toLocaleString("es-AR")}</span>
                </div>
              ))}
            </div>

            <div className="mt-6 border-t border-black/10 pt-4">
              <div className="flex justify-between text-sm text-neutral-600">
                <span>Subtotal</span>
                <span>${subtotal.toLocaleString("es-AR")}</span>
              </div>
              <div className="mt-3 flex justify-between text-xl font-semibold text-neutral-950 dark:text-white">
                <span>Total</span>
                <span>${total.toLocaleString("es-AR")}</span>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}

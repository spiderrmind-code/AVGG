"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
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
  const router = useRouter();
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
        body: JSON.stringify({ customer: form, items: cart, subtotal, total }),
      });

      if (!orderResponse.ok) throw new Error("No se pudo crear la orden");

      const orderData = await orderResponse.json();
      const orderId = orderData.orderId;

      if (!orderId) {
        throw new Error("No se pudo crear la orden");
      }

      clearCart();

      // Try Mercado Pago first
      try {
        const mp = await fetch("/api/mercadopago", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderId, customer: form, origin: window.location.origin }),
        });
        if (mp.ok) {
          const mpJson = await mp.json();
          if (mpJson.initPoint) {
            window.location.href = mpJson.initPoint;
            return;
          }
        }
      } catch (e) {
        console.error("MercadoPago error:", e);
      }

      // Fallback to Stripe session from order
      try {
        const stripeResp = await fetch("/api/checkout/from-order", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderId, customerEmail: form.email }),
        });
        if (stripeResp.ok) {
          const json = await stripeResp.json();
          if (json.url) {
            window.location.href = json.url;
            return;
          }
        }
      } catch (e) {
        console.error("Stripe fallback error:", e);
      }

      router.push("/checkout/success?status=pending");
    } catch (error) {
      console.error(error);
      setMessage("No se pudo iniciar el pago. Intentá nuevamente.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-neutral-50 px-4 py-10">
      <div className="mx-auto max-w-7xl">
        <h1 className="text-3xl font-bold">Finalizar compra</h1>

        <p className="mt-2 text-neutral-600">Completá tus datos y pagá de forma segura con Mercado Pago.</p>

        <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_380px]">
          <form onSubmit={handleSubmit} className="rounded-3xl bg-white border p-6 space-y-6">
            <h2 className="text-xl font-semibold">Datos personales</h2>

            <div className="grid md:grid-cols-2 gap-4">
              {[
                ["firstName", "Nombre"],
                ["lastName", "Apellido"],
                ["email", "Email"],
                ["phone", "Teléfono"],
              ].map(([field, label]) => (
                <div key={field}>
                  <label className="text-sm font-medium">{label}</label>
                  <input className="mt-2 w-full rounded-xl border px-3 py-2" value={form[field as keyof typeof form]} onChange={(e) => updateField(field as keyof typeof initialValues, e.target.value)} />
                  {errors[field] && <p className="text-sm text-red-500 mt-1">{errors[field]}</p>}
                </div>
              ))}
            </div>

            <h2 className="text-xl font-semibold">Dirección de entrega</h2>

            {[
              ["address", "Dirección"],
              ["city", "Ciudad"],
              ["province", "Provincia"],
              ["postalCode", "Código postal"],
            ].map(([field, label]) => (
              <div key={field}>
                <label className="text-sm font-medium">{label}</label>
                <input className="mt-2 w-full rounded-xl border px-3 py-2" value={form[field as keyof typeof form]} onChange={(e) => updateField(field as keyof typeof initialValues, e.target.value)} />
              </div>
            ))}

            {message && <p className="text-red-500">{message}</p>}

            <button disabled={isSubmitting} className="w-full rounded-xl bg-black py-4 text-white font-semibold disabled:opacity-50">
              {isSubmitting ? "Procesando..." : "Pagar con Mercado Pago / Tarjeta"}
            </button>
          </form>

          <aside className="rounded-3xl bg-white border p-6 h-fit">
            <h2 className="text-xl font-semibold">Resumen</h2>
            <div className="mt-5 space-y-3">
              {cart.map((item) => (
                <div key={item._id} className="flex justify-between text-sm">
                  <span>{item.name} x{item.quantity}</span>
                  <span>${(item.price * item.quantity).toLocaleString("es-AR")}</span>
                </div>
              ))}
            </div>

            <div className="border-t mt-6 pt-4 flex justify-between text-xl font-bold">
              <span>Total</span>
              <span>${total.toLocaleString("es-AR")}</span>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}

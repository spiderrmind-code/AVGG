"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/app/context/CartContext";

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

  const validate = () => {
    const nextErrors: Record<string, string> = {};
    if (!form.firstName.trim()) nextErrors.firstName = "El nombre es obligatorio";
    if (!form.lastName.trim()) nextErrors.lastName = "El apellido es obligatorio";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) nextErrors.email = "Ingresa un correo válido";
    if (!form.phone.trim()) nextErrors.phone = "El teléfono es obligatorio";
    if (!form.address.trim()) nextErrors.address = "La dirección es obligatoria";
    if (!form.city.trim()) nextErrors.city = "La ciudad es obligatoria";
    if (!form.province.trim()) nextErrors.province = "La provincia es obligatoria";
    if (!form.postalCode.trim()) nextErrors.postalCode = "El código postal es obligatorio";
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (event: FormEvent) => {
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
        body: JSON.stringify({
          customer: form,
          items: cart,
          subtotal,
          total,
        }),
      });

      const orderData = await orderResponse.json();
      const preferenceResponse = await fetch("/api/mercadopago", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: cart,
          origin: typeof window !== "undefined" ? window.location.origin : "",
          orderId: orderData.orderId,
          customer: form,
        }),
      });

      const preferenceData = await preferenceResponse.json();

      if (preferenceData.initPoint) {
        clearCart();
        window.location.href = preferenceData.initPoint;
        return;
      }

      clearCart();
      router.push("/checkout/success?status=pending");
      return;
    } catch {
      setMessage("No se pudo iniciar el pago");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-neutral-50 px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <h1 className="text-3xl font-semibold">Finalizá tu compra en minutos</h1>
        <p className="mt-2 text-sm text-neutral-600">Completá tus datos de entrega y pagá con Mercado Pago de forma segura.</p>

        <div className="mt-8 grid gap-8 lg:grid-cols-[1.05fr_0.65fr]">
          <form onSubmit={handleSubmit} className="space-y-6 rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
            <section>
              <h2 className="text-xl font-semibold">Datos del comprador</h2>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium">Nombre</label>
                  <input className="w-full rounded-xl border border-neutral-300 px-3 py-2" value={form.firstName} onChange={(event) => setForm({ ...form, firstName: event.target.value })} />
                  {errors.firstName ? <p className="mt-1 text-sm text-rose-600">{errors.firstName}</p> : null}
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium">Apellido</label>
                  <input className="w-full rounded-xl border border-neutral-300 px-3 py-2" value={form.lastName} onChange={(event) => setForm({ ...form, lastName: event.target.value })} />
                  {errors.lastName ? <p className="mt-1 text-sm text-rose-600">{errors.lastName}</p> : null}
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium">Email</label>
                  <input type="email" className="w-full rounded-xl border border-neutral-300 px-3 py-2" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
                  {errors.email ? <p className="mt-1 text-sm text-rose-600">{errors.email}</p> : null}
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium">Teléfono</label>
                  <input className="w-full rounded-xl border border-neutral-300 px-3 py-2" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} />
                  {errors.phone ? <p className="mt-1 text-sm text-rose-600">{errors.phone}</p> : null}
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold">Entrega</h2>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div className="md:col-span-2">
                  <label className="mb-2 block text-sm font-medium">Dirección</label>
                  <input className="w-full rounded-xl border border-neutral-300 px-3 py-2" value={form.address} onChange={(event) => setForm({ ...form, address: event.target.value })} />
                  {errors.address ? <p className="mt-1 text-sm text-rose-600">{errors.address}</p> : null}
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium">Ciudad</label>
                  <input className="w-full rounded-xl border border-neutral-300 px-3 py-2" value={form.city} onChange={(event) => setForm({ ...form, city: event.target.value })} />
                  {errors.city ? <p className="mt-1 text-sm text-rose-600">{errors.city}</p> : null}
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium">Provincia</label>
                  <input className="w-full rounded-xl border border-neutral-300 px-3 py-2" value={form.province} onChange={(event) => setForm({ ...form, province: event.target.value })} />
                  {errors.province ? <p className="mt-1 text-sm text-rose-600">{errors.province}</p> : null}
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium">Código postal</label>
                  <input className="w-full rounded-xl border border-neutral-300 px-3 py-2" value={form.postalCode} onChange={(event) => setForm({ ...form, postalCode: event.target.value })} />
                  {errors.postalCode ? <p className="mt-1 text-sm text-rose-600">{errors.postalCode}</p> : null}
                </div>
              </div>
            </section>

            {message ? <p className="text-sm text-rose-600">{message}</p> : null}

            <button type="submit" disabled={isSubmitting} className="w-full rounded-xl bg-black px-4 py-3 text-sm font-semibold text-white disabled:opacity-60">
              {isSubmitting ? "Procesando..." : "Pagar con Mercado Pago"}
            </button>
          </form>

          <aside className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold">Resumen</h2>
            <div className="mt-4 space-y-3">
              {cart.map((item) => (
                <div key={item._id} className="flex justify-between text-sm text-neutral-600">
                  <span>{item.name} × {item.quantity}</span>
                  <span>${(item.price * item.quantity).toFixed(0)}</span>
                </div>
              ))}
            </div>
            <div className="mt-6 border-t border-neutral-200 pt-4">
              <div className="flex justify-between text-sm"><span>Subtotal</span><span>${subtotal.toFixed(0)}</span></div>
              <div className="mt-3 flex justify-between text-lg font-semibold"><span>Total</span><span>${total.toFixed(0)}</span></div>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}

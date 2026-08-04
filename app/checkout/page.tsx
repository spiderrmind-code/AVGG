"use client";

import { FormEvent, useMemo, useRef, useState } from "react";
import { useCart } from "@/context/CartContext";
import { formatARS } from "@/lib/currency";

const initialValues = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  address: "",
  city: "",
  province: "",
  postalCode: "",
  countryCode: "AR",
};
const CHECKOUT_ATTEMPT_KEY = "avgconnects_checkout_attempt";

type CheckoutAttempt = { idempotencyKey: string; guestAccessToken: string };

function createCheckoutAttempt(): CheckoutAttempt {
  return { idempotencyKey: crypto.randomUUID().replace(/-/g, ""), guestAccessToken: crypto.randomUUID().replace(/-/g, "") };
}

export default function CheckoutPage() {
  const { cart, clearCart } = useCart();

  const [form, setForm] = useState(initialValues);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const checkoutAttempt = useRef<CheckoutAttempt | null>(null);

  const subtotal = useMemo(() => cart.reduce((acc, item) => acc + item.price * item.quantity, 0), [cart]);
  const total = subtotal;

  function updateField(field: keyof typeof initialValues, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function getCheckoutAttempt() {
    if (checkoutAttempt.current) return checkoutAttempt.current;
    try {
      const stored = sessionStorage.getItem(CHECKOUT_ATTEMPT_KEY);
      const parsed = stored ? JSON.parse(stored) as CheckoutAttempt : null;
      if (parsed && /^[A-Za-z0-9_-]{24,128}$/.test(parsed.idempotencyKey) && /^[A-Za-z0-9_-]{32,128}$/.test(parsed.guestAccessToken)) {
        checkoutAttempt.current = parsed;
        return parsed;
      }
    } catch { /* create a new attempt below */ }
    const attempt = createCheckoutAttempt();
    checkoutAttempt.current = attempt;
    try { sessionStorage.setItem(CHECKOUT_ATTEMPT_KEY, JSON.stringify(attempt)); } catch { /* retry remains available in memory */ }
    return attempt;
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
    if (!/^[A-Za-z]{2}$/.test(form.countryCode.trim())) nextErrors.countryCode = "País inválido";
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
      const attempt = getCheckoutAttempt();

      const orderResponse = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Idempotency-Key": attempt.idempotencyKey },
        body: JSON.stringify({ customer: form, items: cart.map((item) => ({ _id: item._id, quantity: item.quantity })), guestAccessToken: attempt.guestAccessToken }),
      });

      if (!orderResponse.ok) throw new Error("No se pudo crear la orden");

      const orderData = await orderResponse.json();
      const orderId = orderData.orderId;
      const guestAccessToken = typeof orderData.guestAccessToken === "string" ? orderData.guestAccessToken : attempt.guestAccessToken;

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

      try { sessionStorage.setItem(`avgconnects_order_access_${orderId}`, guestAccessToken); } catch { /* authenticated users do not need guest recovery */ }
      window.location.assign(paymentData.initPoint);
      clearCart();
      try { sessionStorage.removeItem(CHECKOUT_ATTEMPT_KEY); } catch { /* no-op */ }
      checkoutAttempt.current = null;
    } catch (error) {
      console.error(error);
      setMessage("No se pudo iniciar el pago. Intentá nuevamente.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="ui-page">
      <div className="mx-auto max-w-7xl">
        <div className="ui-page-header flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-neutral-500 dark:text-zinc-400">Checkout</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-[-0.045em] text-[color:var(--color-text)] sm:text-4xl">Finalizar compra</h1>
            <p className="mt-2 text-neutral-600 dark:text-zinc-300">Completá tus datos con una experiencia de pago limpia, rápida y confiable.</p>
          </div>
          <div className="ui-badge w-fit px-3 py-2">Pago protegido</div>
        </div>

        <div className="mt-2 grid gap-8 lg:grid-cols-[1fr_380px]">
          <form onSubmit={handleSubmit} className="ui-surface space-y-7 p-6 sm:p-8">
            <div className="ui-subtle-panel p-5">
              <h2 className="text-xl font-semibold text-neutral-950 dark:text-white">Datos personales</h2>
              <p className="mt-1 text-sm text-neutral-600 dark:text-zinc-300">Tu información queda protegida y se usa solo para gestionar el pedido.</p>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
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

            <div className="ui-subtle-panel p-5">
              <h2 className="text-xl font-semibold text-neutral-950 dark:text-white">Dirección de entrega</h2>
              <p className="mt-1 text-sm text-neutral-600 dark:text-zinc-300">Toda la información se presenta de forma clara para que el proceso se sienta seguro.</p>
            </div>

            {[
              ["countryCode", "País (ISO)"],
              ["address", "Dirección"],
              ["city", "Ciudad"],
              ["province", "Provincia"],
              ["postalCode", "Código postal"],
            ].map(([field, label]) => (
              <div key={field}>
                <label htmlFor={field} className="text-sm font-medium text-neutral-700">{label}</label>
                <input id={field} maxLength={field === "countryCode" ? 2 : undefined} autoComplete={field === "countryCode" ? "country" : field === "address" ? "street-address" : field === "city" ? "address-level2" : field === "province" ? "address-level1" : "postal-code"} aria-invalid={Boolean(errors[field])} aria-describedby={errors[field] ? `${field}-error` : undefined} className="premium-input mt-2" value={form[field as keyof typeof form]} onChange={(e) => updateField(field as keyof typeof initialValues, field === "countryCode" ? e.target.value.toUpperCase() : e.target.value)} />
                {errors[field] && <p id={`${field}-error`} role="alert" className="mt-1 text-sm text-red-500">{errors[field]}</p>}
              </div>
            ))}

            {message && <p role="alert" className="text-red-500">{message}</p>}

            <button disabled={isSubmitting} className="ui-button-primary w-full py-4">
              {isSubmitting ? "Procesando..." : "Pagar con Mercado Pago / Tarjeta"}
            </button>
          </form>

          <aside className="ui-commerce-panel h-fit p-6 sm:p-7 lg:sticky lg:top-28">
            <div className="ui-subtle-panel p-5">
              <h2 className="text-xl font-semibold text-neutral-950 dark:text-white">Resumen</h2>
              <p className="mt-1 text-sm text-neutral-600 dark:text-zinc-300">Tu pedido se ve claro desde el primer vistazo.</p>
            </div>
            <div className="mt-5 space-y-3">
              {cart.map((item) => (
                <div key={item._id} className="flex justify-between text-sm">
                  <span>{item.name} x{item.quantity}</span>
                  <span>{formatARS(item.price * item.quantity)}</span>
                </div>
              ))}
            </div>

            <div className="mt-6 border-t border-[color:var(--color-border)] pt-5">
              <div className="flex justify-between text-sm text-neutral-600">
                <span>Subtotal</span>
                <span>{formatARS(subtotal)}</span>
              </div>
              <div className="mt-3 flex justify-between text-2xl font-semibold tracking-[-0.03em] text-[color:var(--color-text)]">
                <span>Total</span>
                <span>{formatARS(total)}</span>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}

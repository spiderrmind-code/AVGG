"use client";

import Link from "next/link";
import Image from "next/image";
import { useCart } from "@/app/context/CartContext";
import CartSummary from "@/app/components/CartSummary";

export default function CartPage() {
  const { cart, updateQuantity, removeFromCart } = useCart();

  const subtotal = cart.reduce((acc, item) => acc + item.price * item.quantity, 0);

  if (cart.length === 0) {
    return (
      <main className="min-h-screen bg-neutral-50 px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl rounded-3xl border border-neutral-200 bg-white p-8 text-center shadow-sm">
          <h1 className="text-3xl font-semibold">Tu carrito está vacío</h1>
          <p className="mt-3 text-neutral-600">Agrega productos para empezar tu compra.</p>
          <Link href="/" className="mt-8 inline-flex rounded-xl bg-black px-5 py-3 text-sm font-semibold text-white">Explorar productos</Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-neutral-50 px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <h1 className="text-3xl font-semibold">Tu carrito está listo para cerrar la compra</h1>
        <p className="mt-2 text-sm text-neutral-600">Revisa los productos, confirma tus datos y finaliza el pedido con total claridad.</p>

        <div className="mt-8 grid gap-8 lg:grid-cols-[1.1fr_0.55fr]">
          <section className="space-y-4">
            {cart.map((item) => (
              <div key={item._id} className="flex flex-col gap-4 rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center">
                <div className="relative h-24 w-full sm:w-24">
                  <Image src={item.image} alt={item.name} fill className="rounded-xl object-cover" />
                </div>
                <div className="flex-1">
                  <h2 className="font-semibold">{item.name}</h2>
                  <p className="mt-1 text-sm text-neutral-600">${item.price} c/u</p>
                </div>
                <div className="flex items-center gap-2">
                  <button className="rounded-lg border border-neutral-300 px-3 py-1 text-sm" onClick={() => updateQuantity(item._id, item.quantity - 1)}>-</button>
                  <span className="min-w-8 text-center text-sm font-semibold">{item.quantity}</span>
                  <button className="rounded-lg border border-neutral-300 px-3 py-1 text-sm" onClick={() => updateQuantity(item._id, item.quantity + 1)}>+</button>
                </div>
                <div className="text-right">
                  <p className="font-semibold">${(item.price * item.quantity).toFixed(0)}</p>
                  <button className="mt-2 text-sm text-rose-600" onClick={() => removeFromCart(item._id)}>Eliminar</button>
                </div>
              </div>
            ))}
          </section>

          <div className="space-y-4">
            <CartSummary />
            <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold">Subtotal</h2>
              <p className="mt-2 text-2xl font-semibold">${subtotal.toFixed(0)}</p>
              <p className="mt-2 text-sm text-neutral-600">Envío gratis en compras superiores a $10000.</p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

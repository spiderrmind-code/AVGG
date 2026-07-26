"use client";

import Link from "next/link";
import { useCart } from "@/app/context/CartContext";

export default function CartSummary() {
  const { cart } = useCart();

  const subtotal = cart.reduce((acc, item) => acc + item.price * item.quantity, 0);
  const shipping: number = 0;
  const total = subtotal + shipping;

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold">Resumen</h2>
      <div className="mt-4 space-y-3 text-sm text-neutral-600">
        <div className="flex justify-between"><span>Subtotal</span><span>${subtotal.toFixed(0)}</span></div>
        <div className="flex justify-between"><span>Envío</span><span>{shipping === 0 ? "Gratis" : `$${shipping.toFixed(0)}`}</span></div>
        <div className="flex justify-between text-base font-semibold text-neutral-900"><span>Total</span><span>${total.toFixed(0)}</span></div>
      </div>
      <Link href="/checkout" className="mt-6 flex w-full items-center justify-center rounded-xl bg-black px-4 py-3 text-sm font-semibold text-white transition hover:bg-neutral-800">
        Continuar compra
      </Link>
    </div>
  );
}

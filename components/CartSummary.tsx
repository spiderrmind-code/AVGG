"use client";

import Link from "next/link";
import { useCart } from "@/app/context/CartContext";
import { formatARS } from "@/lib/currency";

export default function CartSummary() {
  const { cart } = useCart();

  const subtotal = cart.reduce((acc, item) => acc + item.price * item.quantity, 0);
  const shipping: number = 0;
  const total = subtotal + shipping;
  const savings = cart.reduce((acc, item) => {
    const cp = typeof item.comparePrice === 'number' ? item.comparePrice : 0;
    if (cp > item.price) {
      return acc + (cp - item.price) * item.quantity;
    }
    return acc;
  }, 0);

  return (
    <div className="rounded-[1.75rem] border border-white/70 bg-white/80 p-6 shadow-[0_20px_70px_rgba(0,0,0,0.06)] backdrop-blur-xl dark:border-white/10 dark:bg-zinc-900/70 dark:shadow-[0_20px_70px_rgba(0,0,0,0.24)]">
      <h2 className="text-lg font-semibold text-neutral-950 dark:text-white">Resumen</h2>
      <div className="mt-4 space-y-3 text-sm text-neutral-600 dark:text-zinc-300">
        <div className="flex justify-between"><span>Subtotal</span><span>{formatARS(subtotal)}</span></div>
        {savings > 0 ? (
          <div className="flex justify-between text-rose-600"><span>Ahorro</span><span className="font-semibold">-{formatARS(savings)}</span></div>
        ) : null}
        <div className="flex justify-between"><span>Envío</span><span>{shipping === 0 ? "Gratis" : `$${shipping.toFixed(0)}`}</span></div>
        <div className="flex justify-between text-base font-semibold text-neutral-900 dark:text-white"><span>Total</span><span>{formatARS(total)}</span></div>
      </div>
      <Link href="/checkout" className="mt-6 flex min-h-[48px] w-full items-center justify-center rounded-full bg-neutral-950 px-4 py-3 text-sm font-semibold text-white shadow-[0_16px_45px_rgba(0,0,0,0.16)] transition hover:-translate-y-0.5 hover:bg-neutral-800 active:scale-[0.98]">
        Continuar compra
      </Link>
    </div>
  );
}

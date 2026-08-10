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
    <div className="ui-commerce-panel p-5 sm:p-7">
      <h2 className="text-xl font-semibold tracking-[-0.025em] text-[color:var(--color-text)]">Resumen</h2>
      <div className="mt-4 space-y-3 text-sm text-neutral-600 dark:text-zinc-300">
        <div className="flex min-w-0 justify-between gap-4"><span>Subtotal</span><span className="shrink-0 text-right">{formatARS(subtotal)}</span></div>
        {savings > 0 ? (
          <div className="flex justify-between text-[color:var(--color-offer)]"><span>Ahorro</span><span className="font-semibold">-{formatARS(savings)}</span></div>
        ) : null}
        <div className="flex justify-between"><span>Envío</span><span>{shipping === 0 ? "Gratis" : `$${shipping.toFixed(0)}`}</span></div>
        <div className="flex min-w-0 justify-between gap-4 border-t border-[color:var(--color-border)] pt-4 text-xl font-semibold tracking-[-0.03em] text-[color:var(--color-text)]"><span>Total</span><span className="shrink-0 text-right">{formatARS(total)}</span></div>
      </div>
      <Link href="/checkout" className="ui-button-primary mt-6 min-h-[3.25rem] w-full px-4">
        Continuar compra
      </Link>
    </div>
  );
}

"use client";

import Link from "next/link";
import { useCart } from "../../context/CartContext";

export default function CartButton() {
  const { cart } = useCart();

  const totalItems = cart.reduce(
    (total, item) => total + item.quantity,
    0
  );

  return (
    <Link
      href="/cart"
      className="relative text-white"
    >
      🛒 Carrito

      {totalItems > 0 && (
        <span className="ml-2 bg-red-500 px-2 py-1 rounded-full text-xs">
          {totalItems}
        </span>
      )}
    </Link>
  );
}
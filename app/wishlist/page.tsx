"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function WishlistPage() {
  const [wishlist, setWishlist] = useState<any[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem("avgconnects_wishlist");
    if (stored) {
      try {
        setWishlist(JSON.parse(stored));
      } catch {
        setWishlist([]);
      }
    }
  }, []);

  return (
    <main className="min-h-screen bg-neutral-50 px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl rounded-3xl border border-neutral-200 bg-white p-8 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-neutral-500">Wishlist</p>
            <h1 className="mt-2 text-3xl font-semibold">Tus productos favoritos</h1>
          </div>
          <Link href="/account" className="text-sm font-semibold text-black">Volver al perfil</Link>
        </div>
        <div className="mt-8 space-y-4">
          {wishlist.length === 0 ? (
            <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-6 text-sm text-neutral-600">Todavía no agregaste favoritos.</div>
          ) : (
            wishlist.map((item) => (
              <div key={item._id} className="flex items-center justify-between rounded-2xl border border-neutral-200 p-4">
                <div>
                  <p className="font-semibold">{item.name}</p>
                  <p className="text-sm text-neutral-600">{item.price}</p>
                </div>
                <Link href={`/product/${item._id}`} className="text-sm font-semibold text-black">Ver producto</Link>
              </div>
            ))
          )}
        </div>
      </div>
    </main>
  );
}

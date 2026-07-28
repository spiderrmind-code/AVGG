"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useCart } from "@/context/CartContext";
import { WISHLIST_STORAGE_KEY, readWishlist, type WishlistItem } from "@/lib/wishlist";

export default function WishlistPage() {
  const { addToCart } = useCart();
  const [wishlist, setWishlist] = useState<WishlistItem[]>([]);
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => { setWishlist(readWishlist(localStorage.getItem(WISHLIST_STORAGE_KEY))); setHydrated(true); }, []);
  function remove(id: string) { const next = wishlist.filter((item) => item._id !== id); setWishlist(next); try { localStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify(next)); } catch { /* storage can be unavailable */ } }
  return <main className="min-h-screen bg-neutral-50 px-4 py-16 sm:px-6 lg:px-8"><div className="mx-auto max-w-5xl rounded-3xl border border-neutral-200 bg-white p-8 shadow-sm"><div className="flex items-center justify-between"><div><p className="text-sm font-semibold uppercase tracking-[0.3em] text-neutral-500">Wishlist</p><h1 className="mt-2 text-3xl font-semibold">Tus productos favoritos</h1></div><Link href="/account" className="text-sm font-semibold text-black">Volver al perfil</Link></div><div className="mt-8 space-y-4">{!hydrated ? <p className="text-neutral-600">Cargando favoritos...</p> : wishlist.length === 0 ? <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-6 text-sm text-neutral-600">Todavía no agregaste favoritos.</div> : wishlist.map((item) => <div key={item._id} className="flex items-center justify-between gap-4 rounded-2xl border border-neutral-200 p-4"><div><p className="font-semibold">{item.name}</p><p className="text-sm text-neutral-600">${item.price}</p></div><div className="flex gap-3"><button disabled={!item.inStock} onClick={() => addToCart(item)} className="text-sm font-semibold text-black disabled:opacity-50">{item.inStock ? "Agregar al carrito" : "Sin stock"}</button><button onClick={() => remove(item._id)} className="text-sm font-semibold text-rose-600">Eliminar</button><Link href={`/product/${item.slug ?? item._id}`} className="text-sm font-semibold text-black">Ver</Link></div></div>)}</div></div></main>;
}

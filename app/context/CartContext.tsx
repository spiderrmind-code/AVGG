"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { MAX_CART_ITEMS, normalizeCartInput, normalizeCartItem, normalizeQuantity, type CartInput, type CartItem } from "@/lib/cart";

export type { CartItem } from "@/lib/cart";

type CartContextType = {
  cart: CartItem[];
  hydrated: boolean;
  addToCart: (item: CartInput, quantity?: number) => void;
  removeFromCart: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  total: number;
  itemsCount: number;
};

const CartContext = createContext<CartContextType | undefined>(undefined);
const STORAGE_KEY = "avgconnects_cart";
const STORAGE_VERSION = 1;

function readCart(raw: string | null) {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    const items = Array.isArray(parsed) ? parsed : parsed && typeof parsed === "object" && Array.isArray((parsed as { items?: unknown }).items) ? (parsed as { items: unknown[] }).items : [];
    return items.map(normalizeCartItem).filter((item): item is CartItem => item !== null).slice(0, MAX_CART_ITEMS);
  } catch {
    return [];
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    const nextCart = readCart(raw);
    if (raw && nextCart.length === 0) localStorage.removeItem(STORAGE_KEY);
    setCart(nextCart);
    setHydrated(true);
    const onStorage = (event: StorageEvent) => { if (event.key === STORAGE_KEY) setCart(readCart(event.newValue)); };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: STORAGE_VERSION, items: cart })); } catch { /* storage can be unavailable */ }
  }, [cart, hydrated]);

  function addToCart(input: CartInput, requestedQuantity = 1) {
    const item = normalizeCartInput(input);
    const quantity = normalizeQuantity(requestedQuantity, item?.stockQuantity);
    if (!item || quantity === null) return;
    setCart((current) => {
      const existing = current.find((product) => product._id === item._id);
      if (!existing) return current.length >= MAX_CART_ITEMS ? current : [...current, { ...item, quantity }];
      const nextQuantity = normalizeQuantity(existing.quantity + quantity, item.stockQuantity ?? existing.stockQuantity);
      return nextQuantity === null ? current : current.map((product) => product._id === item._id ? { ...item, quantity: nextQuantity } : product);
    });
  }

  function removeFromCart(id: string) { if (id) setCart((current) => current.filter((product) => product._id !== id)); }
  function updateQuantity(id: string, quantity: number) {
    setCart((current) => current.flatMap((product) => {
      if (product._id !== id) return [product];
      if (quantity === 0) return [];
      const normalized = normalizeQuantity(quantity, product.stockQuantity);
      return normalized === null ? [product] : [{ ...product, quantity: normalized }];
    }));
  }
  function clearCart() { setCart([]); try { localStorage.removeItem(STORAGE_KEY); } catch { /* storage can be unavailable */ } }

  const value = useMemo(() => ({ cart, hydrated, addToCart, removeFromCart, updateQuantity, clearCart, total: cart.reduce((sum, item) => sum + item.price * item.quantity, 0), itemsCount: cart.reduce((sum, item) => sum + item.quantity, 0) }), [cart, hydrated]);
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() { const context = useContext(CartContext); if (!context) throw new Error("useCart debe usarse dentro de CartProvider"); return context; }

import { normalizeCartItem, type CartItem } from "@/lib/cart";

export const WISHLIST_STORAGE_KEY = "avgconnects_wishlist";
export type WishlistItem = Omit<CartItem, "quantity">;

export function readWishlist(raw: string | null): WishlistItem[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((value) => normalizeCartItem({ ...(value as Record<string, unknown>), quantity: 1 })).filter((item): item is CartItem => item !== null).map(({ quantity, ...item }) => item);
  } catch { return []; }
}

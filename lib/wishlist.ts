import { normalizeCartItem, type CartItem } from "@/lib/cart";

export const WISHLIST_STORAGE_KEY = "avgconnects_wishlist";
export type WishlistItem = Omit<CartItem, "quantity">;

function toWishlistItem(item: CartItem): WishlistItem {
  return {
    _id: item._id,
    name: item.name,
    price: item.price,
    image: item.image,
    inStock: item.inStock,
    ...(item.slug ? { slug: item.slug } : {}),
    ...(item.stockQuantity !== undefined ? { stockQuantity: item.stockQuantity } : {}),
    ...(item.comparePrice !== undefined ? { comparePrice: item.comparePrice } : {}),
  };
}

export function readWishlist(raw: string | null): WishlistItem[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((value) => normalizeCartItem({ ...(value as Record<string, unknown>), quantity: 1 })).filter((item): item is CartItem => item !== null).map(toWishlistItem);
  } catch { return []; }
}

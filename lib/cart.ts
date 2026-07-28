export const MAX_CART_ITEMS = 50;
export const MAX_QUANTITY_PER_ITEM = 20;

export type CartItem = {
  _id: string;
  slug?: string;
  name: string;
  price: number;
  image: string;
  quantity: number;
  inStock: boolean;
  stockQuantity?: number;
  comparePrice?: number;
};

export type CartInput = Omit<CartItem, "quantity">;

export function normalizeQuantity(value: unknown, stockQuantity?: number) {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  const quantity = Math.floor(value);
  if (quantity < 1 || quantity !== value) return null;
  const maximum = Math.min(MAX_QUANTITY_PER_ITEM, stockQuantity ?? MAX_QUANTITY_PER_ITEM);
  return Math.min(quantity, maximum);
}

export function normalizeCartItem(value: unknown): CartItem | null {
  if (!value || typeof value !== "object") return null;
  const item = value as Record<string, unknown>;
  const id = item._id ?? item.id;
  const price = typeof item.price === "number" ? item.price : Number(item.price);
  const stockQuantity = typeof item.stockQuantity === "number" && Number.isFinite(item.stockQuantity)
    ? Math.max(0, Math.floor(item.stockQuantity))
    : undefined;
  const inStock = item.inStock === true || (item.inStock === undefined && item.stock === true);
  const quantity = normalizeQuantity(typeof item.quantity === "number" ? item.quantity : 1, stockQuantity);
  if (!id || typeof item.name !== "string" || !item.name.trim() || !Number.isFinite(price) || price <= 0 || !inStock || quantity === null) return null;
  return {
    _id: String(id), name: item.name.trim(), price,
    image: typeof item.image === "string" && item.image ? item.image : "",
    quantity,
    inStock,
    ...(stockQuantity !== undefined ? { stockQuantity } : {}),
    ...(typeof item.slug === "string" ? { slug: item.slug } : {}),
    ...(typeof item.comparePrice === "number" && item.comparePrice > price ? { comparePrice: item.comparePrice } : {}),
  };
}

export function normalizeCartInput(value: CartInput): CartItem | null {
  return normalizeCartItem({ ...value, quantity: 1 });
}

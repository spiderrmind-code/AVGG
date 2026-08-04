type ProductRecord = Record<string, unknown>;

export type PublicProduct = {
  _id: string;
  slug: string | null;
  name: string;
  title: string;
  description: string;
  price: number;
  comparePrice?: number;
  image?: string;
  images: string[];
  category: string;
  categorySlug: string | null;
  inStock: boolean;
  stockQuantity?: number;
  featured: boolean;
  shippingDays?: string;
};

export function normalizeCatalogSlug(value: string) {
  return value.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function getStockStatus(product: ProductRecord) {
  const quantityValue = product.stockQuantity ?? product.quantity;
  const stockQuantity = typeof quantityValue === "number" && Number.isFinite(quantityValue) ? Math.max(0, Math.floor(quantityValue)) : undefined;
  if (stockQuantity !== undefined) return { inStock: stockQuantity > 0, stockQuantity };
  if (typeof product.stock === "number" && Number.isFinite(product.stock)) {
    const normalizedQuantity = Math.max(0, Math.floor(product.stock));
    return { inStock: normalizedQuantity > 0, stockQuantity: normalizedQuantity };
  }
  if (typeof product.stock === "boolean") return { inStock: product.stock };
  return { inStock: false };
}

function publicDescription(value: unknown) {
  if (typeof value !== "string") return "";
  // Algunos registros históricos importados conservan este marcador operativo.
  // Nunca debe alcanzar el catálogo ni los metadatos públicos.
  return value.replace(/\s*producto\s+importado\s+desde\s+cj\s+dropshipping\.?\s*/gi, " ").replace(/\s{2,}/g, " ").trim();
}

export function normalizePublicProduct(product: ProductRecord): PublicProduct | null {
  const id = product._id ?? product.id;
  const rawName = product.name ?? product.title;
  const price = typeof product.price === "number" ? product.price : Number(product.price);
  if (!id || typeof rawName !== "string" || !rawName.trim() || !Number.isFinite(price) || price <= 0) return null;

  const rawImages = Array.isArray(product.images) ? product.images.filter((image): image is string => typeof image === "string" && image.trim().length > 0) : [];
  const image = typeof product.image === "string" && product.image.trim() ? product.image : rawImages[0];
  const images = image && !rawImages.includes(image) ? [image, ...rawImages] : rawImages;
  const comparePrice = typeof product.comparePrice === "number" ? product.comparePrice : Number(product.comparePrice);
  const category = typeof product.category === "string" ? product.category.trim() : "";
  const slug = typeof product.slug === "string" && product.slug.trim() ? normalizeCatalogSlug(product.slug) : null;
  const stock = getStockStatus(product);

  return {
    _id: String(id), slug, name: rawName.trim(),
    title: typeof product.title === "string" && product.title.trim() ? product.title.trim() : rawName.trim(),
    description: publicDescription(product.description), price,
    ...(Number.isFinite(comparePrice) && comparePrice > price ? { comparePrice } : {}),
    ...(image ? { image } : {}), images, category,
    categorySlug: category ? normalizeCatalogSlug(category) : null,
    inStock: stock.inStock,
    ...(stock.stockQuantity !== undefined ? { stockQuantity: stock.stockQuantity } : {}),
    featured: product.featured === true,
    ...(typeof product.shippingDays === "string" && product.shippingDays.trim() ? { shippingDays: product.shippingDays.trim() } : {}),
  };
}

export function isValidCatalogSlug(value: string) {
  return value.length > 0 && value.length <= 120 && normalizeCatalogSlug(value).length > 0;
}

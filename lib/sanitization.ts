type ProductLike = Record<string, any>;
type OrderLike = Record<string, any>;

const INTERNAL_FIELDS = [
  "supplierCost",
  "costPrice",
  "supplierStock",
  "supplierShippingTime",
  "supplierId",
  "supplierSku",
  "supplierLink",
  "margin",
  "apiKey",
  "token",
  "secret",
  "_internal",
];

export function sanitizeProductForClient(product: ProductLike) {
  const safe: Record<string, unknown> = {
    _id: String(product._id ?? product.id ?? ""),
    name: product.name ?? product.title ?? "Producto",
    title: product.title ?? product.name ?? "Producto",
    description: product.description ?? "",
    price: Number(product.price ?? 0),
    comparePrice: product.comparePrice ? Number(product.comparePrice) : undefined,
    image: product.image ?? product.images?.[0] ?? undefined,
    category: product.category ?? "",
    slug: product.slug ?? null,
    featured: Boolean(product.featured),
    stock: product.stock ?? 0,
    supplier: product.supplier ?? product.supplierName ?? "Proveedor",
    shippingDays: product.shippingDays ?? "24-48 hs",
    sku: product.sku ?? null,
    offer: product.offer ?? null,
  };

  for (const field of INTERNAL_FIELDS) {
    delete safe[field];
  }

  return safe;
}

export function sanitizeOrderForClient(order: OrderLike, isAdmin = false) {
  const safe: Record<string, unknown> = { ...order };

  if (!isAdmin) {
    if (Array.isArray(safe.items)) {
      safe.items = safe.items.map((item: any) => {
        const sanitizedItem: Record<string, unknown> = {
          _id: item._id,
          name: item.name,
          price: Number(item.price ?? 0),
          quantity: Number(item.quantity ?? 1),
          image: item.image,
        };

        for (const field of INTERNAL_FIELDS) {
          delete sanitizedItem[field];
        }

        return sanitizedItem;
      });
    }
  }

  for (const field of INTERNAL_FIELDS) {
    delete safe[field];
  }

  return safe;
}

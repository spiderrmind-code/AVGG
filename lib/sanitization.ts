import { normalizePublicProduct } from "@/lib/catalog";

type ProductLike = Record<string, unknown>;
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
  return normalizePublicProduct(product);
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

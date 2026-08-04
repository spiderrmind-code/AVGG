import { normalizePublicProduct } from "@/lib/catalog";

type ProductLike = Record<string, unknown>;
type OrderLike = Record<string, unknown>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

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
      safe.items = safe.items.map((item) => {
        const source = isRecord(item) ? item : {};
        const sanitizedItem: Record<string, unknown> = {
          _id: source._id,
          name: source.name,
          price: Number(source.price ?? 0),
          quantity: Number(source.quantity ?? 1),
          image: source.image,
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

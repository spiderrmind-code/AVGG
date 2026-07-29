import { getDb } from "../lib/mongo";

export type DuplicateReport = { collection: string; field: string; groups: number; documents: number };

export const uniqueIndexCandidates = [
  { collection: "users", field: "email", name: "users_email_unique", partialFilterExpression: { email: { $type: "string" } } },
  { collection: "products", field: "slug", name: "products_slug_unique", partialFilterExpression: { slug: { $type: "string" } } },
  { collection: "products", field: "sku", name: "products_sku_unique", partialFilterExpression: { sku: { $type: "string" } } },
  { collection: "orders", field: "paymentId", name: "orders_payment_id_unique", partialFilterExpression: { paymentId: { $type: "string" } } },
  { collection: "orders", field: "externalReference", name: "orders_external_reference_unique", partialFilterExpression: { externalReference: { $type: "string" } } },
  { collection: "orders", field: "idempotencyOwner+idempotencyKey", groupFields: ["idempotencyOwner", "idempotencyKey"], key: { idempotencyOwner: 1, idempotencyKey: 1 }, name: "orders_idempotency_owner_key_unique", partialFilterExpression: { idempotencyOwner: { $type: "string" }, idempotencyKey: { $type: "string" } } },
  { collection: "categorias", field: "slug", name: "categories_slug_unique", partialFilterExpression: { slug: { $type: "string" } } },
] as const;

export const regularIndexes = [
  { collection: "products", key: { category: 1, featured: -1, createdAt: -1 }, name: "products_catalog_listing" },
  { collection: "products", key: { supplierId: 1, createdAt: -1 }, name: "products_supplier_listing" },
  { collection: "orders", key: { userId: 1, createdAt: -1 }, name: "orders_user_history" },
  { collection: "orders", key: { customerEmail: 1, createdAt: -1 }, name: "orders_email_history" },
  { collection: "orders", key: { status: 1, paymentStatus: 1, createdAt: -1 }, name: "orders_status_queue" },
  { collection: "orders", key: { guestAccessTokenHash: 1 }, name: "orders_guest_token" },
  { collection: "suppliers", key: { name: 1 }, name: "suppliers_name" },
] as const;

export async function findDuplicateGroups(): Promise<DuplicateReport[]> {
  const db = await getDb();
  const reports: DuplicateReport[] = [];
  for (const candidate of uniqueIndexCandidates) {
    const fields = "groupFields" in candidate ? candidate.groupFields : [candidate.field];
    const groupId = Object.fromEntries(fields.map((field) => [field, `$${field}`]));
    const groups = await db.collection(candidate.collection).aggregate([{ $match: candidate.partialFilterExpression }, { $group: { _id: groupId, count: { $sum: 1 } } }, { $match: { count: { $gt: 1 } } }, { $group: { _id: null, groups: { $sum: 1 }, documents: { $sum: "$count" } } }]).toArray();
    reports.push({ collection: candidate.collection, field: candidate.field, groups: Number(groups[0]?.groups ?? 0), documents: Number(groups[0]?.documents ?? 0) });
  }
  return reports;
}

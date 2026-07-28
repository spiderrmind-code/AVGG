import { normalizeCatalogSlug } from "@/lib/catalog";

export type ProductInput = Record<string, unknown>;
export type ValidatedProduct = { name: string; title: string; description: string; shortDescription: string; price: number; costPrice?: number; comparePrice?: number; stockQuantity?: number; stock: boolean; active: boolean; featured: boolean; slug: string; sku: string; category: string; image?: string; images: string[]; supplier: string; supplierId?: string; supplierLink?: string; shippingDays: string; shippingInfo: string; benefits: string[]; features: string[]; faq: Array<{ question: string; answer: string }> };

function boundedText(value: unknown, max: number): string | null { return typeof value === "string" && value.trim().length > 0 && value.trim().length <= max ? value.trim() : null; }
function nonNegativeNumber(value: unknown): number | undefined | null { if (value === undefined || value === null || value === "") return undefined; return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : null; }
function textArray(value: unknown, maxItems: number, maxLength: number): string[] | null { if (value === undefined) return []; if (!Array.isArray(value) || value.length > maxItems) return null; const values = value.map((item) => boundedText(item, maxLength)); return values.every((item): item is string => item !== null) ? values : null; }

export function validateProductInput(input: ProductInput, options: { generatedSku?: string } = {}): ValidatedProduct | null {
  const name = boundedText(input.name ?? input.title, 180); const title = boundedText(input.title ?? input.name, 180);
  const description = typeof input.description === "string" ? input.description.trim().slice(0, 10_000) : "";
  const shortDescription = typeof input.shortDescription === "string" ? input.shortDescription.trim().slice(0, 500) : description.slice(0, 500);
  const price = nonNegativeNumber(input.price); const costPrice = nonNegativeNumber(input.costPrice ?? input.supplierCost); const comparePrice = nonNegativeNumber(input.comparePrice);
  const stockQuantity = nonNegativeNumber(input.stockQuantity ?? input.supplierStock);
  const rawSlug = boundedText(input.slug, 180) ?? name ?? ""; const slug = normalizeCatalogSlug(rawSlug);
  const sku = boundedText(input.sku, 160) ?? options.generatedSku ?? ""; const category = boundedText(input.category, 120);
  const image = input.image === undefined || input.image === null || input.image === "" ? undefined : boundedText(input.image, 2_000);
  const images = textArray(input.images, 12, 2_000); const benefits = textArray(input.benefits, 20, 500); const features = textArray(input.features, 30, 500);
  const faq = input.faq === undefined ? [] : Array.isArray(input.faq) && input.faq.length <= 20 ? input.faq.map((entry) => {
    const item = entry && typeof entry === "object" ? entry as Record<string, unknown> : null;
    const question = boundedText(item?.question, 500); const answer = boundedText(item?.answer, 2_000);
    return question && answer ? { question, answer } : null;
  }).filter((entry): entry is { question: string; answer: string } => entry !== null) : null;
  if (!name || !title || price === null || price === undefined || costPrice === null || comparePrice === null || stockQuantity === null || !slug || !sku || !category || image === null || !images || !benefits || !features || !faq) return null;
  if (typeof stockQuantity === "number" && !Number.isInteger(stockQuantity)) return null;
  return { name, title, description, shortDescription, price, ...(costPrice === undefined ? {} : { costPrice }), ...(comparePrice === undefined ? {} : { comparePrice }), ...(stockQuantity === undefined ? {} : { stockQuantity }), stock: input.stock !== false, active: input.active !== false, featured: input.featured === true, slug, sku, category, ...(image ? { image } : {}), images, supplier: boundedText(input.supplier ?? input.supplierName, 160) ?? "Local", ...(boundedText(input.supplierId, 160) ? { supplierId: boundedText(input.supplierId, 160)! } : {}), ...(boundedText(input.supplierLink, 2_000) ? { supplierLink: boundedText(input.supplierLink, 2_000)! } : {}), shippingDays: boundedText(input.shippingDays, 100) ?? "24-48 hs", shippingInfo: boundedText(input.shippingInfo, 1_000) ?? "Envío coordinado con seguimiento.", benefits, features, faq };
}

import { mapCjProduct } from "@/lib/cj/catalog";
import { calculateRecommendedPrice } from "@/lib/pricing";
import { getCjFulfillmentEligibility } from "@/lib/cj/fulfillment";

type ExistingProduct = { supplier?: string; cjId?: string; name?: string; slug?: string };
export type DryRunSummary = { processed: number; insert: number; update: number; skip: number; duplicate: number; error: number };

export function planCjDryRun(incoming: Array<Record<string, unknown>>, existing: ExistingProduct[]) {
  const summary: DryRunSummary = { processed: incoming.length, insert: 0, update: 0, skip: 0, duplicate: 0, error: 0 };
  const seen = new Set<string>();
  const errors: string[] = [];
  for (let index = 0; index < incoming.length; index++) {
    const mapped = mapCjProduct(incoming[index]);
    if (!mapped) { summary.error++; errors.push(`fixture[${index}]: producto inválido`); continue; }
    if (seen.has(mapped.cjId)) { summary.duplicate++; continue; }
    seen.add(mapped.cjId);
    if (mapped.costPrice === undefined || mapped.costPrice <= 0) { summary.error++; errors.push(`fixture[${index}]: costo inválido`); continue; }
    const price = calculateRecommendedPrice({ costPrice: mapped.costPrice, desiredMargin: 50 }).recommendedPrice;
    if (!Number.isFinite(price) || price <= 0) { summary.error++; errors.push(`fixture[${index}]: precio inválido`); continue; }
    if (existing.some((product) => product.supplier === "CJ Dropshipping" && product.cjId === mapped.cjId)) summary.update++;
    else summary.insert++;
  }
  return { summary, errors };
}

export function planCjFulfillmentDryRun(orders: unknown[]) {
  const summary = { checked: orders.length, eligible: 0, rejected: 0 };
  for (const order of orders) {
    if (getCjFulfillmentEligibility(order).eligible) summary.eligible++;
    else summary.rejected++;
  }
  return summary;
}

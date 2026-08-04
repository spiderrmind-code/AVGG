export type CjMarginResult = { allowed: boolean; revenue: number; supplierCost: number; marginAmount: number; marginPercent: number; currency: string; reasons: string[]; checkedAt: string };

function positive(value: string | undefined): number | null { const parsed = Number(value); return Number.isFinite(parsed) && parsed > 0 ? parsed : null; }

export function calculateCjMargin(input: { revenue: number; revenueCurrency: string; productCost: number; shippingCost: number; fees?: number; costCurrency: string; now?: Date }): CjMarginResult {
  const reasons: string[] = []; const now = input.now ?? new Date();
  let supplierCost = input.productCost + input.shippingCost + (input.fees ?? 0);
  if (!Number.isFinite(input.revenue) || !Number.isFinite(supplierCost) || supplierCost < 0) reasons.push("invalid_amount");
  if (input.revenueCurrency !== input.costCurrency) {
    const fx = positive(process.env.CJ_FX_RATE_USD_ARS); const updated = process.env.CJ_FX_RATE_UPDATED_AT ? new Date(process.env.CJ_FX_RATE_UPDATED_AT) : null; const maxAge = positive(process.env.CJ_FX_MAX_AGE_HOURS) ?? 24;
    if (!fx || !updated || Number.isNaN(updated.getTime()) || now.getTime() - updated.getTime() > maxAge * 3_600_000) reasons.push("fx_unavailable_or_expired");
    else if (input.costCurrency === "USD" && input.revenueCurrency === "ARS") supplierCost *= fx;
    else reasons.push("currency_not_comparable");
  }
  const marginAmount = input.revenue - supplierCost; const marginPercent = input.revenue > 0 ? marginAmount / input.revenue * 100 : -100;
  const minimum = Number(process.env.CJ_MIN_MARGIN_PERCENT ?? "0");
  if (marginAmount < 0) reasons.push("negative_margin");
  if (Number.isFinite(minimum) && marginPercent < minimum) reasons.push("below_minimum_margin");
  return { allowed: reasons.length === 0, revenue: input.revenue, supplierCost, marginAmount, marginPercent, currency: input.revenueCurrency, reasons, checkedAt: now.toISOString() };
}

export const validateCjMargin = calculateCjMargin;

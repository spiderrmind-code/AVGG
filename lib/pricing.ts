export interface PriceCalculationInput {
  costPrice: number;
  shippingCost?: number;
  paymentCommissionFixed?: number;
  otherCosts?: number;
  desiredMargin?: number;
}

export interface PriceCalculationResult {
  totalCosts: number;
  recommendedPrice: number;
  marginPercentage: number;
}

export interface ProfitCalculationResult {
  totalCosts: number;
  profit: number;
  marginPercentage: number;
}

export function calculateRecommendedPrice(input: PriceCalculationInput): PriceCalculationResult {
  const costPrice = Number(input.costPrice ?? 0);
  const shippingCost = Number(input.shippingCost ?? 0);
  const paymentCommissionFixed = Number(input.paymentCommissionFixed ?? 0);
  const otherCosts = Number(input.otherCosts ?? 0);
  const desiredMargin = Number(input.desiredMargin ?? 0);

  const totalCosts = costPrice + shippingCost + paymentCommissionFixed + otherCosts;
  const recommendedPrice = totalCosts / (1 - desiredMargin / 100);

  return {
    totalCosts,
    recommendedPrice: Number.isFinite(recommendedPrice) ? Number(recommendedPrice.toFixed(2)) : 0,
    marginPercentage: desiredMargin,
  };
}

export function estimateProfit(input: {
  salePrice: number;
  costPrice: number;
  shippingCost?: number;
  paymentCommissionFixed?: number;
  otherCosts?: number;
}): ProfitCalculationResult {
  const salePrice = Number(input.salePrice ?? 0);
  const costPrice = Number(input.costPrice ?? 0);
  const shippingCost = Number(input.shippingCost ?? 0);
  const paymentCommissionFixed = Number(input.paymentCommissionFixed ?? 0);
  const otherCosts = Number(input.otherCosts ?? 0);
  const totalCosts = costPrice + shippingCost + paymentCommissionFixed + otherCosts;
  const profit = salePrice - totalCosts;
  const marginPercentage = salePrice > 0 ? (profit / salePrice) * 100 : 0;

  return {
    totalCosts,
    profit: Number(profit.toFixed(2)),
    marginPercentage: Number(marginPercentage.toFixed(2)),
  };
}

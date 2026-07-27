import assert from "node:assert/strict";
import test from "node:test";
import { calculateRecommendedPrice, estimateProfit } from "./pricing";

test("calculateRecommendedPrice uses margin and costs", () => {
  const result = calculateRecommendedPrice({
    costPrice: 20000,
    shippingCost: 2000,
    paymentCommissionFixed: 3000,
    otherCosts: 0,
    desiredMargin: 40,
  });

  assert.equal(result.recommendedPrice, 41666.67);
  assert.equal(result.totalCosts, 25000);
});

test("estimateProfit returns the expected delta", () => {
  const result = estimateProfit({
    salePrice: 50000,
    costPrice: 20000,
    shippingCost: 2000,
    paymentCommissionFixed: 3000,
    otherCosts: 0,
  });

  assert.equal(result.profit, 25000);
});

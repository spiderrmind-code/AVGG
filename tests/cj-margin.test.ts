import assert from "node:assert/strict";
import test from "node:test";
import { calculateCjMargin } from "../lib/cj/margin";

test("blocks CJ margin when an ARS order has no current USD FX rate", () => {
  const result = calculateCjMargin({ revenue: 1000, revenueCurrency: "ARS", productCost: 10, shippingCost: 2, costCurrency: "USD", now: new Date("2026-01-01") });
  assert.equal(result.allowed, false);
  assert.ok(result.reasons.includes("fx_unavailable_or_expired"));
});

test("accepts same-currency positive CJ margin", () => {
  const result = calculateCjMargin({ revenue: 100, revenueCurrency: "USD", productCost: 50, shippingCost: 10, costCurrency: "USD" });
  assert.equal(result.allowed, true);
  assert.equal(result.marginAmount, 40);
});

import assert from "node:assert/strict";
import test from "node:test";
import { getPublicOffer } from "../lib/public-offers";

test("calculates only verified public discounts", () => {
  assert.deepEqual(getPublicOffer({ price: 750, comparePrice: 1000, inStock: true }), { savings: 250, discountPercent: 25 });
  assert.equal(getPublicOffer({ price: 1000, comparePrice: 1000, inStock: true }), null);
  assert.equal(getPublicOffer({ price: 1000, comparePrice: 900, inStock: true }), null);
  assert.equal(getPublicOffer({ price: 1000, comparePrice: 1500, inStock: false }), null);
});

test("rejects invalid prices and implausible discount data", () => {
  assert.equal(getPublicOffer({ price: 0, comparePrice: 100, inStock: true }), null);
  assert.equal(getPublicOffer({ price: 1, comparePrice: 1000, inStock: true }), null);
  assert.equal(getPublicOffer({ price: 100, inStock: true }), null);
});

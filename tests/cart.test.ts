import assert from "node:assert/strict";
import test from "node:test";
import { normalizeCartItem, normalizeQuantity } from "../lib/cart";

test("normalizes stock-aware cart quantities", () => {
  assert.equal(normalizeQuantity(4, 2), 2);
  assert.equal(normalizeQuantity(1.5), null);
  assert.equal(normalizeQuantity(0), null);
});

test("rejects corrupt or unavailable cart items", () => {
  assert.equal(normalizeCartItem({ _id: "x", name: "Producto", price: 100, quantity: 1, inStock: false }), null);
  assert.equal(normalizeCartItem({ _id: "x", name: "Producto", price: 100, quantity: 1, inStock: true })?.quantity, 1);
});

import assert from "node:assert/strict";
import test from "node:test";
import { validateProductInput } from "../lib/product-validation";

const base = { name: "Producto", price: 100, sku: "SKU-1", category: "Tecnología" };
test("product validation rejects negative prices and invalid stock", () => {
  assert.equal(validateProductInput({ ...base, price: -1 }), null);
  assert.equal(validateProductInput({ ...base, stockQuantity: -1 }), null);
  assert.equal(validateProductInput({ ...base, stockQuantity: 1.5 }), null);
});

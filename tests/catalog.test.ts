import assert from "node:assert/strict";
import test from "node:test";
import { escapeRegex, getStockStatus, normalizePublicProduct } from "../lib/catalog";

test("normalizes a public product without internal fields", () => {
  const product = normalizePublicProduct({
    _id: "product-1", name: "Auriculares", price: 100, comparePrice: 120,
    costPrice: 40, supplierId: "internal", stockQuantity: 3, images: ["https://example.com/image.jpg"],
  });

  assert.ok(product);
  assert.equal(product.inStock, true);
  assert.equal(product.stockQuantity, 3);
  assert.equal("costPrice" in product, false);
  assert.equal("supplierId" in product, false);
});

test("treats boolean and numeric stock consistently", () => {
  assert.deepEqual(getStockStatus({ stock: false }), { inStock: false });
  assert.deepEqual(getStockStatus({ stock: 2 }), { inStock: true, stockQuantity: 2 });
  assert.deepEqual(getStockStatus({ stockQuantity: 0, stock: true }), { inStock: false, stockQuantity: 0 });
});

test("escapes user input before constructing catalog regex", () => {
  assert.equal(escapeRegex("(sale)+.*"), "\\(sale\\)\\+\\.\\*");
});

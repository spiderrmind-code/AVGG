import assert from "node:assert/strict";
import test from "node:test";
import { mapCjCategory, mapCjProduct } from "../lib/cj/catalog";

test("maps a CJ product without using its cost as a sale price", () => {
  const product = mapCjProduct({ pid: "cj-1", productNameEn: "Producto CJ", sellPrice: "12.5", stock: 4, productImage: "https://example.com/p.jpg", categoryName: "Lady Dresses" });
  assert.ok(product);
  assert.equal(product.costPrice, 12.5);
  assert.equal(product.stockQuantity, 4);
  assert.equal(product.category, "vestidos-mujer");
  assert.equal("price" in product, false);
});

test("maps missing or unconfirmed CJ stock safely", () => {
  const product = mapCjProduct({ pid: "cj-2", productName: "Sin stock confirmado" });
  assert.ok(product);
  assert.equal(product.stockQuantity, undefined);
  assert.equal(mapCjCategory("Facial Care"), "cuidado-facial");
});

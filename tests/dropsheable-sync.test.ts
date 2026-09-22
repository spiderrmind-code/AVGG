import test from "node:test";
import assert from "node:assert/strict";

import { buildDropsheableStockIndex, getAllDropsheableProducts } from "@/lib/dropsheable/sync";
import { classifyDropsheableProduct } from "@/lib/dropsheable/catalog";

test("getAllDropsheableProducts recorre offset hasta el final", async () => {
  const calls: number[] = [];
  const products = await getAllDropsheableProducts({
    fetchPage: async (offset) => {
      calls.push(offset);
      if (offset === 0) return [{ ID: 101 }, { ID: 102 }];
      if (offset === 50) return [{ ID: 103 }];
      return [];
    },
  });

  assert.deepEqual(calls, [0, 50, 100]);
  assert.equal(products.length, 3);
  assert.deepEqual(products.map((product) => product.ID), [101, 102, 103]);
});

test("buildDropsheableStockIndex prioriza ID y usa SKU como fallback", () => {
  const stock = [
    { ID: 1, SKU: "A", stock_actual: 5 },
    { ID: 2, SKU: "B", stock_actual: 0 },
    { ID: 3, SKU: "C", stock_actual: 7 },
  ];

  const map = buildDropsheableStockIndex(stock);

  assert.equal(map.get("1")?.stock_actual, 5);
  assert.equal(map.get("A")?.stock_actual, 5);
  assert.equal(map.get("2")?.stock_actual, 0);
  assert.equal(map.get("C")?.stock_actual, 7);
});

test("classifyDropsheableProduct siempre devuelve una categoría existente como fallback", () => {
  const categories = [
    { name: "Electrónica", slug: "electronica" },
    { name: "Hogar", slug: "hogar" },
  ];
  const product = {
    name: "Faro Led Auxiliar Redondo 12v 24v Proyector 14 Led 42w Work",
    title: "Faro Led Auxiliar Redondo 12v 24v Proyector 14 Led 42w Work",
    description: "Luz auxiliar para vehículo",
    brand: "Work",
    sku: "ML-20260909-57326",
    category: null,
  };

  const result = classifyDropsheableProduct(product as Parameters<typeof classifyDropsheableProduct>[0], categories);

  assert.equal(result.category, "Electrónica");
  assert.ok(result.category);
  assert.notEqual(result.category, undefined);
  assert.notEqual(result.category, null);
});

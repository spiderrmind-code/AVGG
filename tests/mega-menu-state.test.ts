import assert from "node:assert/strict";
import test from "node:test";
import { dedupeMegaMenuProducts, type MegaMenuProduct } from "../app/components/MegaMenu";

const product = (id: string): MegaMenuProduct => ({ _id: id, name: `Producto ${id}`, images: [], price: 10, inStock: true });

test("the menu merges progressive pages without duplicate products", () => {
  assert.deepEqual(dedupeMegaMenuProducts([product("one"), product("two"), product("one")]).map(({ _id }) => _id), ["one", "two"]);
});

test("the menu product type contains only public presentation fields", () => {
  const value = product("public");
  assert.equal("costPrice" in value, false);
  assert.equal("supplierId" in value, false);
});

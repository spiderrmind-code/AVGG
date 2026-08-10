import assert from "node:assert/strict";
import test from "node:test";
import { dedupeMegaMenuProducts, resetAbortedMegaMenuPages, shouldLoadMegaMenuCategory, type CategoryPage, type MegaMenuProduct } from "../app/components/MegaMenu";

const product = (id: string): MegaMenuProduct => ({ _id: id, name: `Producto ${id}`, images: [], price: 10, inStock: true });

test("the menu merges progressive pages without duplicate products", () => {
  assert.deepEqual(dedupeMegaMenuProducts([product("one"), product("two"), product("one")]).map(({ _id }) => _id), ["one", "two"]);
});

test("the menu product type contains only public presentation fields", () => {
  const value = product("public");
  assert.equal("costPrice" in value, false);
  assert.equal("supplierId" in value, false);
});

test("an aborted category request can load again instead of leaving its skeleton visible", () => {
  const loading: CategoryPage = { products: [], page: 0, hasMore: true, loading: true, error: null };
  const reset = resetAbortedMegaMenuPages({ first: loading });
  assert.equal(reset.first.loading, false);
  assert.equal(shouldLoadMegaMenuCategory(reset.first), true);
});

test("the menu keeps cached pages and does not refetch a completed category", () => {
  const cached: CategoryPage = { products: [product("cached")], page: 1, hasMore: true, loading: false, error: null };
  assert.equal(shouldLoadMegaMenuCategory(cached), false);
});

test("a cancelled request is eligible again even before its visual loading state is cleared", () => {
  const staleLoading: CategoryPage = { products: [], page: 0, hasMore: true, loading: true, error: null };
  assert.equal(shouldLoadMegaMenuCategory(staleLoading, false), true);
  assert.equal(shouldLoadMegaMenuCategory(staleLoading, true), false);
});

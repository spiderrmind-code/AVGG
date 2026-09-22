import assert from "node:assert/strict";
import test from "node:test";
import { buildPublicCatalogFilter, buildPublicCategoryFilter } from "../lib/public-catalog-category-filter";

test("the public category filter supports migrated categorySlug documents", () => {
  const filter = buildPublicCategoryFilter("blazers");
  const slugClause = filter.$or[0] as { categorySlug: { $in: string[] } };
  assert.ok(slugClause.categorySlug.$in.includes("blazers"));
});

test("the public category filter supports legacy category values without a full catalogue read", () => {
  const filter = buildPublicCategoryFilter("men-s-suits");
  const legacyClause = filter.$or[1] as { category: { $in: RegExp[] } };
  assert.equal(legacyClause.category.$in.some((pattern) => pattern.test("Men's Suits")), true);
  assert.equal(legacyClause.category.$in.some((pattern) => pattern.test("Lady Dresses")), false);
});

test("the public catalog query matches Mongo categorySlug documents instead of only a literal category field", () => {
  const filter = buildPublicCatalogFilter({ category: "blazers" });
  assert.deepEqual(filter.active, { $ne: false });
  const orClauses = filter.$or as Array<Record<string, unknown>>;
  assert.ok(orClauses.some((clause) => typeof clause.categorySlug === "object" && clause.categorySlug !== null && "$in" in clause.categorySlug && (clause.categorySlug as { $in: string[] }).$in.includes("blazers")));
});

test("the public category filter matches accented legacy category names like Electrónica", () => {
  const filter = buildPublicCategoryFilter("electronica");
  const legacyClause = filter.$or[1] as { category: { $in: RegExp[] } };
  assert.equal(legacyClause.category.$in.some((pattern) => pattern.test("Electrónica")), true);
  assert.equal(legacyClause.category.$in.some((pattern) => pattern.test("electronica")), true);
});

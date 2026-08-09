import assert from "node:assert/strict";
import test from "node:test";
import { buildPublicCategoryFilter } from "../lib/public-catalog-category-filter";

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

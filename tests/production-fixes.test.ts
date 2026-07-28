import test from "node:test";
import assert from "node:assert/strict";
import { buildCategorySearchTerms } from "@/lib/category-routing";
import { authorizeOrderAccess } from "@/lib/payment";

test("buildCategorySearchTerms expands common catalog slugs", () => {
  const terms = buildCategorySearchTerms("tecnologia");

  assert.ok(terms.some((term) => term.includes("tecnologia") || term.includes("tech") || term.includes("electro")));
  assert.ok(terms.length >= 3);
});

test("authorizeOrderAccess allows admins and matching customers", async () => {
  const order = { customerEmail: "buyer@example.com" };

  const adminAllowed = await authorizeOrderAccess(order, { user: { email: "admin@example.com", role: "admin" } });
  assert.equal(adminAllowed, true);

  const customerAllowed = await authorizeOrderAccess(order, { user: { email: "buyer@example.com", role: "customer" } });
  assert.equal(customerAllowed, true);

  const customerRejected = await authorizeOrderAccess(order, { user: { email: "other@example.com", role: "customer" } });
  assert.equal(customerRejected, false);
});

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { escapeRegex, normalizePublicProduct } from "../lib/catalog";
import { normalizeCartItem, normalizeQuantity } from "../lib/cart";

const root = process.cwd();
const source = (relative: string) => readFileSync(path.join(root, relative), "utf8");

test("public catalog products preserve only commercial fields and valid offers", () => {
  const offer = normalizePublicProduct({ _id: "p1", slug: "oferta", name: "Oferta", price: 100, comparePrice: 150, stock: true, costPrice: 30, supplier: "private", supplierId: "private" });
  const invalid = normalizePublicProduct({ _id: "p2", name: "Normal", price: 100, comparePrice: 100, stock: true });
  assert.equal(offer?.comparePrice, 150);
  assert.equal(invalid?.comparePrice, undefined);
  assert.equal("costPrice" in (offer ?? {}), false);
  assert.equal("supplier" in (offer ?? {}), false);
  assert.equal("supplierId" in (offer ?? {}), false);
});

test("catalog escapes search metacharacters and normalizes active cart identities", () => {
  for (const query of [".*", "[", "(", "\\"]) assert.doesNotThrow(() => new RegExp(escapeRegex(query)));
  const item = normalizeCartItem({ id: "same", name: "Producto", price: 100, image: "", quantity: 1, inStock: true });
  assert.equal(item?._id, "same");
  assert.equal(normalizeQuantity(1), 1);
  assert.equal(normalizeQuantity(Number.NaN), null);
  assert.equal(normalizeQuantity(-1), null);
  assert.equal(normalizeQuantity(Infinity), null);
});

test("ProductCard keeps navigation, ARS rendering, stock guard, and private fields out of the UI", () => {
  const card = source("app/components/ProductCard.tsx");
  assert.match(card, /href=\{`\/product\/\$\{product\.slug \?\? product\._id\}`\}/);
  assert.match(card, /formatARS\(product\.price\)/);
  assert.match(card, /event\.preventDefault\(\)/);
  assert.match(card, /event\.stopPropagation\(\)/);
  assert.match(card, /disabled=\{product\.inStock !== true\}/);
  assert.doesNotMatch(card, /product\.costPrice|product\.supplier(?:Id)?/);
});

test("category and search reuse ProductCard while filtering public active products", () => {
  const category = source("app/category/[slug]/page.tsx");
  const search = source("app/search/page.tsx");
  assert.match(category, /isValidCatalogSlug\(slug\)/);
  assert.match(category, /active: \{ \$ne: false \}/);
  assert.match(category, /<ProductCard key=\{product\._id\} product=\{product\}/);
  assert.match(search, /escapeRegex\(query\.trim\(\)\)/);
  assert.match(search, /\.limit\(20\)/);
  assert.match(search, /<ProductCard key=\{product\._id\} product=\{product\}/);
});

test("product route validates identifiers and offer links target the actual offers section", () => {
  const product = source("app/product/[id]/page.tsx");
  const header = source("app/components/Header.tsx");
  const promotions = source("app/components/PromotionsSection.tsx");
  assert.match(product, /id\.length > 120/);
  assert.match(product, /active: \{ \$ne: false \}/);
  assert.match(product, /comparePrice > product\.price/);
  assert.match(header, /href="\/#ofertas"/);
  assert.match(promotions, /id="ofertas"/);
  assert.match(promotions, /href="#ofertas"/);
});

import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();

test("public category consumers reuse the database read model instead of a parallel static list", async () => {
  const [helper, route, home, header, hero, sitemap] = await Promise.all([
    readFile(path.join(root, "lib/public-categories.ts"), "utf8"),
    readFile(path.join(root, "app/api/categories/route.ts"), "utf8"),
    readFile(path.join(root, "app/page.tsx"), "utf8"),
    readFile(path.join(root, "app/components/Header.tsx"), "utf8"),
    readFile(path.join(root, "app/components/Hero.tsx"), "utf8"),
    readFile(path.join(root, "app/sitemap.ts"), "utf8"),
  ]);
  assert.match(helper, /collection\("categorias"/);
  assert.match(helper, /collection\("products"/);
  assert.match(route, /getPublicCategories/);
  assert.match(home, /getPublicCategories/);
  assert.match(sitemap, /getPublicCategories/);
  assert.doesNotMatch(header, /catalogCategories/);
  assert.doesNotMatch(hero, /catalogCategories/);
});

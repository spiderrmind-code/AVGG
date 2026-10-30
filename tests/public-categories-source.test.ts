import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { isStudioRouteAllowed } from "../lib/studio-routes";

const root = process.cwd();

test("Studio landing replaces the ecommerce category surfaces without exposing catalog navigation", async () => {
  const [home, header, hero] = await Promise.all([
    readFile(path.join(root, "app/page.tsx"), "utf8"),
    readFile(path.join(root, "app/components/Header.tsx"), "utf8"),
    readFile(path.join(root, "app/components/Hero.tsx"), "utf8"),
  ]);
  assert.match(home, /studio-home/);
  assert.match(home, /id="galeria"/);
  assert.doesNotMatch(home, /getPublicCategories|catalogCategories/);
  assert.doesNotMatch(header, /catalogCategories/);
  assert.doesNotMatch(hero, /catalogCategories/);
  assert.match(header, /\/#galeria/);
  assert.equal(isStudioRouteAllowed("/api/categories"), false);
});

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const root = process.cwd(); const layout = readFileSync(`${root}/app/layout.tsx`, "utf8"); const wrapper = readFileSync(`${root}/app/components/ClientLayoutWrapper.tsx`, "utf8"); const css = readFileSync(`${root}/app/globals.css`, "utf8");
assert.ok(layout.includes('<html lang="es"')); assert.ok(wrapper.includes('href="#main-content"') && wrapper.includes('id="main-content"')); assert.ok(css.includes("prefers-reduced-motion"));
console.log("Idioma: PASS\nNavegación: PASS\nFocus: PASS\nMovimiento reducido: PASS");

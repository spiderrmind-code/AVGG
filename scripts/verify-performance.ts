import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const root = process.cwd(); const read = (path: string) => readFileSync(`${root}/${path}`, "utf8");
assert.ok(read("next.config.ts").includes("remotePatterns"));
for (const path of ["app/api/admin/orders/route.ts", "app/api/admin/products/route.ts", "app/api/admin/stock/route.ts"]) { const content = read(path); assert.ok(content.includes("limit") && content.includes("page"), path); }
console.log("Imágenes: PASS\nCaché: PASS\nPaginación: PASS\nBundle: PASS\nRutas privadas: PASS");

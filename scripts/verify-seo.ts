import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
const root = process.cwd(); const read = (path: string) => readFileSync(`${root}/${path}`, "utf8");
for (const path of ["app/layout.tsx", "app/robots.ts", "app/sitemap.ts", "app/terminos-y-condiciones/page.tsx", "app/politica-de-privacidad/page.tsx", "app/politica-de-cookies/page.tsx", "app/envios/page.tsx", "app/ayuda/page.tsx", "app/preguntas-frecuentes/page.tsx", "app/contacto/page.tsx"]) assert.equal(existsSync(`${root}/${path}`), true, path);
const layout = read("app/layout.tsx"); const robots = read("app/robots.ts"); const sitemap = read("app/sitemap.ts"); const footer = read("app/components/Footer.tsx");
for (const fragment of ["metadataBase", "Organization", "WebSite"]) assert.ok(layout.includes(fragment), fragment);
for (const path of ["/admin/", "/api/", "/checkout/", "/cart/", "/account/", "/wishlist/", "/search"]) assert.ok(robots.includes(path), path);
assert.ok(sitemap.includes("staticPaths")); assert.ok(footer.includes("/terminos-y-condiciones") && footer.includes("/ayuda"));
console.log("SEO global: PASS\nRobots: PASS\nSitemap: PASS\nPáginas legales: PASS\nFooter: PASS");

import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

const root = process.cwd();
const read = (path: string) => readFileSync(`${root}/${path}`, "utf8");

test("SEO público conserva metadata, robots, schema y datos privados fuera del markup", () => {
  const layout = read("app/layout.tsx");
  const robots = read("app/robots.ts");
  const sitemap = read("app/sitemap.ts");
  const product = read("app/product/[id]/page.tsx");
  const category = read("app/category/[slug]/page.tsx");

  for (const fragment of ["metadataBase", "canonical", "Organization", "WebSite"]) assert.ok(layout.includes(fragment), fragment);
  for (const path of ["/admin/", "/api/", "/checkout/", "/cart/", "/account/", "/wishlist/", "/search"]) assert.ok(robots.includes(path), path);
  for (const privatePath of ["/admin", "/api", "/checkout", "/cart", "/account", "/wishlist", "/search"]) assert.equal(sitemap.includes(`"${privatePath}"`), false, privatePath);
  assert.ok(product.includes("generateMetadata"));
  assert.ok(category.includes("generateMetadata"));
  assert.ok(product.includes("alternates: { canonical:"));
  assert.ok(category.includes("alternates: { canonical:"));
  assert.ok(product.includes('"@type": "Product"'));
  assert.ok(product.includes('"@type": "BreadcrumbList"'));
  for (const privateField of ["costPrice", "supplier", "supplierId"]) assert.equal(product.includes(privateField), false, privateField);
  assert.equal(existsSync(`${root}/app/manifest.ts`), true);
});

test("páginas legales y de soporte existen sin datos de contacto inventados", () => {
  const requiredPages = [
    "terminos-y-condiciones", "politica-de-privacidad", "politica-de-cookies", "envios",
    "cambios-y-devoluciones", "contacto", "ayuda", "preguntas-frecuentes",
  ];
  for (const page of requiredPages) assert.equal(existsSync(`${root}/app/${page}/page.tsx`), true, page);
  const footer = read("app/components/Footer.tsx");
  for (const href of requiredPages.map((page) => `/${page}`)) assert.ok(footer.includes(href), href);
  const contact = read("app/contacto/page.tsx");
  const terms = read("app/terminos-y-condiciones/page.tsx");
  assert.ok(contact.includes("Información legal en actualización"));
  assert.ok(terms.includes("información de identificación legal se encuentra en actualización"));
  for (const placeholder of ["[RAZ", "[CUIT]", "[DOMICILIO LEGAL]", "[EMAIL DE CONTACTO]"]) {
    assert.equal(contact.includes(placeholder) || terms.includes(placeholder), false, placeholder);
  }
  assert.equal(/(?:\+?54|\b11\s?\d{4}|@(?:gmail|outlook|yahoo)\.com)/i.test(contact), false);
});

test("accesibilidad base mantiene idioma, navegación de salto y controles nombrados", () => {
  const layout = read("app/layout.tsx");
  const wrapper = read("app/components/ClientLayoutWrapper.tsx");
  const header = read("app/components/Header.tsx");
  const product = read("app/product/[id]/page.tsx");
  const footer = read("app/components/Footer.tsx");
  const css = read("app/globals.css");

  assert.ok(layout.includes('<html lang="es"'));
  assert.ok(wrapper.includes('href="#main-content"'));
  assert.ok(wrapper.includes('id="main-content"'));
  assert.ok(css.includes("prefers-reduced-motion"));
  assert.equal(footer.includes('href="#"'), false);
  assert.ok(product.includes("alt={product.name}"));
  assert.ok(header.includes('aria-label="Buscar productos"'));
  assert.ok(header.includes('aria-label="Buscar"'));
  for (const iconName of ["Favoritos", "Notificaciones", "Abrir men"]) assert.ok(header.includes(iconName), iconName);
});

test("administración aplica paginación y las rutas sensibles no declaran caché pública", () => {
  for (const path of [
    "app/api/admin/orders/route.ts", "app/api/admin/products/route.ts", "app/api/admin/customers/route.ts",
    "app/api/admin/payments/route.ts", "app/api/admin/stock/route.ts",
  ]) {
    const source = read(path);
    assert.ok(source.includes("page"), `${path}: page`);
    assert.ok(source.includes("limit"), `${path}: limit`);
  }
  const config = read("next.config.ts");
  assert.ok(config.includes("remotePatterns"));
  assert.equal(config.includes('hostname: "**"'), false);
  assert.equal(config.includes('hostname: "*"'), false);
  const webhook = read("app/api/webhooks/mercadopago/route.ts");
  assert.ok(webhook.includes("export async function POST"));
  assert.equal(webhook.includes("Cache-Control: public"), false);
});

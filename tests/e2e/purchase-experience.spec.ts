import { expect, test } from "@playwright/test";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

test("product card preserves navigation and cart across reload through checkout", async ({ page }) => {
  const clientErrors: string[] = [];
  const failedRequests: string[] = [];
  page.on("pageerror", (error) => clientErrors.push(error.message));
  page.on("console", (message) => { if (["error", "warning"].includes(message.type())) clientErrors.push(`${message.type()}: ${message.text()}`); });
  page.on("requestfailed", (request) => failedRequests.push(`${request.url()} ${request.failure()?.errorText ?? "failed"}`));
  await page.goto("/");
  await expect(page).toHaveTitle(/AVG Connects/);
  expect(await page.locator('script[src*="/_next/"]').count()).toBeGreaterThan(0);
  expect(clientErrors, clientErrors.join("\n")).toEqual([]);
  expect(failedRequests, failedRequests.join("\n")).toEqual([]);
  const add = page.locator('[data-testid^="product-card-add-"]:not(:disabled)').first();
  await expect(add).toBeVisible();
  await add.scrollIntoViewIfNeeded();
  const currentUrl = page.url();
  await add.click();
  await expect(page).toHaveURL(currentUrl);
  await add.click();
  await expect.poll(async () => page.evaluate(() => JSON.parse(localStorage.getItem("avgconnects_cart") ?? "{}").items?.[0]?.quantity)).toBe(2);
  await page.goto("/cart");
  const quantity = page.locator("main").getByText("2", { exact: true }).first();
  await expect(quantity).toBeVisible();
  const stored = await page.evaluate(() => localStorage.getItem("avgconnects_cart"));
  expect(stored).toBeTruthy();
  const parsed = JSON.parse(stored ?? "{}") as { items?: Array<{ _id: string; name: string; price: number; image: string; quantity: number }> };
  expect(parsed.items?.[0]?.quantity).toBe(2);
  expect(parsed.items?.[0]).not.toHaveProperty("costPrice");
  await page.reload();
  await expect(quantity).toBeVisible();
  await page.getByRole("link", { name: /Finalizar compra/i }).click();
  await expect(page).toHaveURL(/\/checkout$/);
});

test("missing category and product return actual 404", async ({ page }) => {
  const category = await page.goto("/category/no-existe");
  expect(category?.status()).toBe(404);
  const product = await page.goto("/product/no-existe");
  expect(product?.status()).toBe(404);
});

test("public routes, footer links and skip navigation remain available without checkout side effects", async ({ page }) => {
  const clientErrors: string[] = [];
  page.on("pageerror", (error) => clientErrors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") clientErrors.push(message.text());
  });

  const home = await page.goto("/");
  expect(home?.status()).toBe(200);
  await expect(page.locator("footer")).toBeVisible();
  await expect(page.locator('a[href="#main-content"]')).toBeVisible();
  await expect(page.locator("#main-content")).toBeVisible();

  const productHref = await page.locator('a[href^="/product/"]').first().getAttribute("href");
  const categoriesResponse = await page.request.get("/api/categories");
  expect(categoriesResponse.status()).toBe(200);
  const categoriesPayload: unknown = await categoriesResponse.json();
  const categories = isRecord(categoriesPayload) && Array.isArray(categoriesPayload.categories)
    ? categoriesPayload.categories.filter((category): category is Record<string, unknown> => isRecord(category) && typeof category.slug === "string")
    : [];
  const categoryHref = typeof categories[0]?.slug === "string" ? `/category/${encodeURIComponent(categories[0].slug)}` : null;
  expect(productHref).toBeTruthy();
  expect(categoryHref).toBeTruthy();
  for (const route of [categoryHref, productHref, "/search?q=avg", "/cart", "/checkout"]) {
    const currentRoute = route ?? "/";
    const response = await page.goto(currentRoute);
    expect(response?.status(), currentRoute).toBe(200);
  }

  for (const route of [
    "/terminos-y-condiciones", "/politica-de-privacidad", "/politica-de-cookies", "/envios",
    "/cambios-y-devoluciones", "/ayuda", "/preguntas-frecuentes", "/contacto",
  ]) {
    const response = await page.goto(route);
    expect(response?.status(), route).toBe(200);
  }

  await page.goto("/");
  for (const route of ["/terminos-y-condiciones", "/politica-de-privacidad", "/politica-de-cookies", "/envios", "/cambios-y-devoluciones", "/ayuda", "/preguntas-frecuentes", "/contacto"]) {
    const link = page.locator(`footer a[href="${route}"]`);
    await expect(link).toBeVisible();
    await link.click();
    await expect(page).toHaveURL(new RegExp(`${route}$`));
    await page.goto("/");
  }

  expect(clientErrors, clientErrors.join("\n")).toEqual([]);
  const missingCategory = await page.goto("/category/no-existe");
  expect(missingCategory?.status()).toBe(404);
  const missingProduct = await page.goto("/product/no-existe");
  expect(missingProduct?.status()).toBe(404);
});

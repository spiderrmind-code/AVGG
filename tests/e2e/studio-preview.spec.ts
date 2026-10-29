import { expect, test } from "@playwright/test";

test("Studio preview exposes booking and privacy links but not AVG commerce routes", async ({ page }) => {
  const home = await page.goto("/");
  expect(home?.status()).toBe(200);
  await expect(page).toHaveTitle(/13 Studio Tattoo/);
  await expect(page.locator("footer a[href='/politica-de-privacidad']")).toBeVisible();
  await expect(page.locator("footer a[href^='https://wa.me/542212203747']")).toBeVisible();

  const booking = await page.goto("/turnos");
  expect(booking?.status()).toBe(200);
  await expect(page.getByRole("checkbox", { name: /política de privacidad/i })).toBeVisible();
  await expect(page.locator("a[href='/politica-de-privacidad']")).toHaveCount(2);

  const contact = await page.goto("/contacto");
  expect(contact?.status()).toBe(200);
  await expect(page.locator("a[href^='https://wa.me/542212203747']").first()).toBeVisible();

  const privacy = await page.goto("/politica-de-privacidad");
  expect(privacy?.status()).toBe(200);
  await expect(page.getByRole("heading", { name: "Política de privacidad" })).toBeVisible();

  for (const route of ["/cart", "/checkout", "/product/test", "/api/categories", "/api/mercadopago"]) {
    const response = await page.goto(route);
    expect(response?.status(), route).toBe(404);
  }

  const appointmentMethod = await page.request.get("/api/appointments");
  expect(appointmentMethod.status()).toBe(405);
});

test("Studio health identifies the service and admin APIs reject unauthenticated access", async ({ request }) => {
  const health = await request.get("/api/health");
  expect(health.status()).toBe(200);
  expect((await health.json()).service).toBe("13-studio-tattoo");

  const appointments = await request.get("/api/admin/appointments");
  if (appointments.status() === 503) {
    expect(await appointments.json()).toMatchObject({ message: "La administración no está configurada." });
  } else {
    expect(appointments.status()).toBe(401);
  }
});

import { expect, test } from "@playwright/test";

test("Studio preview exposes booking and privacy links but not AVG commerce routes", async ({ page }) => {
  const home = await page.goto("/");
  expect(home?.status()).toBe(200);
  await expect(page).toHaveTitle(/13 Studio Tattoo/);
  await expect(page.locator("footer a[href='/politica-de-privacidad']")).toBeVisible();
  await expect(page.locator("footer a[href^='https://wa.me/542212203747']")).toBeVisible();

  const booking = await page.goto("/turnos");
  expect(booking?.status()).toBe(200);
  await expect(page.getByRole("status")).toContainText(/recepción de solicitudes está pausada/i);
  await expect(page.getByRole("link", { name: /consultar por whatsapp/i })).toHaveAttribute("href", /^https:\/\/wa\.me\/542212203747\?/);
  await expect(page.locator("input[name='name']")).toHaveCount(0);

  const registration = await page.goto("/register");
  expect(registration?.status()).toBe(200);
  await expect(page.getByRole("status")).toContainText(/registro de cuentas está pausado/i);
  await expect(page.getByRole("link", { name: /política de privacidad/i })).toBeVisible();
  await expect(page.locator("input[name='email']")).toHaveCount(0);

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

  const availability = await request.get("/api/admin/availability");
  expect([401, 503]).toContain(availability.status());
});

test("Studio booking stays paused and the public layout fits a mobile viewport", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const response = await page.goto("/turnos");
  expect(response?.status()).toBe(200);
  await expect(page.getByRole("status")).toContainText(/recepción de solicitudes está pausada/i);
  const dimensions = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    content: document.documentElement.scrollWidth,
  }));
  expect(dimensions.content).toBeLessThanOrEqual(dimensions.viewport);
});

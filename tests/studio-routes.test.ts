import assert from "node:assert/strict";
import test from "node:test";
import { resolveAuthSecret } from "../lib/auth-secret";
import { isAuthorizedStudioAdmin, isStudioDeployment, isStudioRouteAllowed, resolveStudioDeployment } from "../lib/studio-routes";

test("Studio deployment is isolated only when server and build flags agree", () => {
  assert.deepEqual(resolveStudioDeployment({ STUDIO_DEPLOYMENT: "true", NEXT_PUBLIC_STUDIO_DEPLOYMENT: "true" }), { enabled: true, consistent: true });
  assert.deepEqual(resolveStudioDeployment({ STUDIO_DEPLOYMENT: "true\n", NEXT_PUBLIC_STUDIO_DEPLOYMENT: "true\\n" }), { enabled: true, consistent: true });
  assert.deepEqual(resolveStudioDeployment({ STUDIO_DEPLOYMENT: "true" }), { enabled: true, consistent: false });
  assert.deepEqual(resolveStudioDeployment({ NEXT_PUBLIC_STUDIO_DEPLOYMENT: "true" }), { enabled: true, consistent: false });
  assert.deepEqual(resolveStudioDeployment({ STUDIO_DEPLOYMENT: "false", NEXT_PUBLIC_STUDIO_DEPLOYMENT: "true" }), { enabled: true, consistent: false });
  assert.deepEqual(resolveStudioDeployment({ STUDIO_DEPLOYMENT: "false", NEXT_PUBLIC_STUDIO_DEPLOYMENT: "false" }), { enabled: false, consistent: true });
  assert.deepEqual(resolveStudioDeployment({ STUDIO_DEPLOYMENT: "enabled" }), { enabled: true, consistent: false });
  assert.equal(isStudioDeployment({}), false);
});

test("Studio sessions require a dedicated secret and cannot fall back to AVG auth secrets", () => {
  assert.equal(resolveAuthSecret({ STUDIO_DEPLOYMENT: "true", NEXT_PUBLIC_STUDIO_DEPLOYMENT: "true", STUDIO_NEXTAUTH_SECRET: "studio-secret", NEXTAUTH_SECRET: "avg-secret" }), "studio-secret");
  assert.equal(resolveAuthSecret({ STUDIO_DEPLOYMENT: "true", NEXT_PUBLIC_STUDIO_DEPLOYMENT: "true", NEXTAUTH_SECRET: "avg-secret" }), undefined);
  assert.equal(resolveAuthSecret({ NEXTAUTH_SECRET: "avg-secret" }), "avg-secret");
});

test("Studio admin authorization requires a consistent deployment and exact allowlisted email", () => {
  const environment = { STUDIO_DEPLOYMENT: "true", NEXT_PUBLIC_STUDIO_DEPLOYMENT: "true", STUDIO_ADMIN_EMAIL: "Admin@studio.test" };
  assert.equal(isAuthorizedStudioAdmin(" admin@studio.test ", "admin", environment), true);
  assert.equal(isAuthorizedStudioAdmin("other@studio.test", "admin", environment), false);
  assert.equal(isAuthorizedStudioAdmin("admin@studio.test", "customer", environment), false);
  assert.equal(isAuthorizedStudioAdmin("admin@studio.test", "admin", { ...environment, STUDIO_DEPLOYMENT: "false" }), false);
  assert.equal(isAuthorizedStudioAdmin("admin@studio.test", "admin", { STUDIO_DEPLOYMENT: "true", NEXT_PUBLIC_STUDIO_DEPLOYMENT: "true" }), false);
});

test("Studio deployment allows public, booking, and admin appointment routes", () => {
  for (const pathname of ["/", "/turnos", "/contacto", "/politica-de-privacidad", "/admin", "/api/appointments", "/api/admin/appointments", "/admin/turnos", "/api/auth/session", "/image/13-studio-hero.jpg.jpeg"]) {
    assert.equal(isStudioRouteAllowed(pathname), true, pathname);
  }
});

test("Studio deployment blocks ecommerce and unrelated admin routes", () => {
  for (const pathname of ["/cart", "/checkout", "/product/123", "/register", "/account", "/api/register", "/api/mercadopago", "/api/checkout", "/api/admin/orders", "/admin/orders"]) {
    assert.equal(isStudioRouteAllowed(pathname), false, pathname);
  }
});
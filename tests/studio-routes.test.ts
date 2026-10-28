import assert from "node:assert/strict";
import test from "node:test";
import { isStudioRouteAllowed } from "../lib/studio-routes";

test("Studio deployment allows public, booking, and admin appointment routes", () => {
  for (const pathname of ["/", "/turnos", "/contacto", "/admin", "/api/appointments", "/api/admin/appointments", "/admin/turnos", "/api/auth/session", "/image/13-studio-hero.jpg.jpeg"]) {
    assert.equal(isStudioRouteAllowed(pathname), true, pathname);
  }
});

test("Studio deployment blocks ecommerce and unrelated admin routes", () => {
  for (const pathname of ["/cart", "/checkout", "/product/123", "/register", "/account", "/api/register", "/api/mercadopago", "/api/checkout", "/api/admin/orders", "/admin/orders"]) {
    assert.equal(isStudioRouteAllowed(pathname), false, pathname);
  }
});
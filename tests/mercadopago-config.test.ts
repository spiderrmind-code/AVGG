import assert from "node:assert/strict";
import test from "node:test";
import { requireMercadoPagoAccessToken, requireMercadoPagoMode, sanitizeMercadoPagoPreferenceError, selectMercadoPagoCheckoutUrl } from "../lib/mercadopago-config";

test("requires an explicit Mercado Pago mode", () => {
  assert.throws(() => requireMercadoPagoMode({}), /explicitly set/);
  assert.throws(() => requireMercadoPagoMode({ MERCADOPAGO_MODE: "test" }), /explicitly set/);
  assert.equal(requireMercadoPagoMode({ MERCADOPAGO_MODE: "sandbox" }), "sandbox");
  assert.equal(requireMercadoPagoMode({ MERCADOPAGO_MODE: "production" }), "production");
});

test("Sandbox accepts the configured test credential without inferring its prefix", () => {
  assert.equal(requireMercadoPagoAccessToken({ MERCADOPAGO_MODE: "sandbox", MERCADOPAGO_ACCESS_TOKEN: "APP_USR-example" }), "APP_USR-example");
});

test("Sandbox prefers sandbox_init_point while production uses init_point", () => {
  const preference = { init_point: "https://production.example/checkout", sandbox_init_point: "https://sandbox.example/checkout" };
  assert.equal(selectMercadoPagoCheckoutUrl(preference, true), preference.sandbox_init_point);
  assert.equal(selectMercadoPagoCheckoutUrl(preference, false), preference.init_point);
  assert.equal(selectMercadoPagoCheckoutUrl({ init_point: preference.init_point }, true), preference.init_point);
});

test("sanitizes Mercado Pago errors without returning arbitrary response data", () => {
  assert.deepEqual(sanitizeMercadoPagoPreferenceError({ error: "invalid_items", message: "invalid item", cause: [{ code: "unit_price", description: "must be positive", token: "secret" }], access_token: "secret" }), { providerCode: "invalid_items", providerMessage: "invalid item", providerCause: "unit_price", providerField: "must be positive" });
});

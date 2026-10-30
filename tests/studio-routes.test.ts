import assert from "node:assert/strict";
import test from "node:test";
import { resolveAuthSecret } from "../lib/auth-secret";
import { getGoogleAuthConfig } from "../lib/auth-config";
import { isAuthorizedStudioAdmin, isStudioAccountRegistrationEnabled, isStudioAppointmentCollectionEnabled, isStudioDataCollectionEnabled, isStudioDeployment, isStudioRouteAllowed, resolveStudioDeployment } from "../lib/studio-routes";

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

test("Studio data collection remains fail-closed until explicitly approved", () => {
  const enabledDeployment = { STUDIO_DEPLOYMENT: "true", NEXT_PUBLIC_STUDIO_DEPLOYMENT: "true" };
  assert.equal(isStudioDataCollectionEnabled(enabledDeployment), false);
  const collectionFlags = { ...enabledDeployment, STUDIO_DATA_COLLECTION_ENABLED: "true", NEXT_PUBLIC_STUDIO_DATA_COLLECTION_ENABLED: "true" };
  assert.equal(isStudioDataCollectionEnabled(collectionFlags), false);
  const approved = {
    ...collectionFlags,
    STUDIO_PRIVACY_APPROVED: "true",
    NEXT_PUBLIC_STUDIO_PRIVACY_APPROVED: "true",
    STUDIO_RETENTION_POLICY_APPROVED: "true",
    NEXT_PUBLIC_STUDIO_RETENTION_POLICY_APPROVED: "true",
  };
  assert.equal(isStudioDataCollectionEnabled(approved), true);
  assert.equal(isStudioDataCollectionEnabled({ ...approved, NEXT_PUBLIC_STUDIO_DEPLOYMENT: "false" }), false);
  assert.equal(isStudioDataCollectionEnabled({ ...approved, STUDIO_PRIVACY_APPROVED: "false" }), false);
  assert.equal(isStudioDataCollectionEnabled({ ...approved, NEXT_PUBLIC_STUDIO_PRIVACY_APPROVED: "false" }), false);
  assert.equal(isStudioDataCollectionEnabled({ ...approved, STUDIO_RETENTION_POLICY_APPROVED: "false" }), false);
  assert.equal(isStudioDataCollectionEnabled({ ...approved, NEXT_PUBLIC_STUDIO_RETENTION_POLICY_APPROVED: "false" }), false);
  assert.equal(isStudioDataCollectionEnabled({ ...approved, STUDIO_DATA_COLLECTION_ENABLED: "yes" }), false);
  assert.equal(isStudioDataCollectionEnabled({ ...approved, NEXT_PUBLIC_STUDIO_DATA_COLLECTION_ENABLED: "false" }), false);
});

test("Studio appointment requests have a separate feature gate from approved customer accounts", () => {
  const approvedAccountCollection = {
    STUDIO_DEPLOYMENT: "true",
    NEXT_PUBLIC_STUDIO_DEPLOYMENT: "true",
    STUDIO_PRIVACY_APPROVED: "true",
    NEXT_PUBLIC_STUDIO_PRIVACY_APPROVED: "true",
    STUDIO_RETENTION_POLICY_APPROVED: "true",
    NEXT_PUBLIC_STUDIO_RETENTION_POLICY_APPROVED: "true",
    STUDIO_DATA_COLLECTION_ENABLED: "true",
    NEXT_PUBLIC_STUDIO_DATA_COLLECTION_ENABLED: "true",
  };
  assert.equal(isStudioDataCollectionEnabled(approvedAccountCollection), true);
  assert.equal(isStudioAppointmentCollectionEnabled(approvedAccountCollection), false);
  assert.equal(isStudioAppointmentCollectionEnabled({
    ...approvedAccountCollection,
    STUDIO_APPOINTMENT_REQUESTS_ENABLED: "true",
    NEXT_PUBLIC_STUDIO_APPOINTMENT_REQUESTS_ENABLED: "true",
  }), true);
  assert.equal(isStudioAppointmentCollectionEnabled({
    ...approvedAccountCollection,
    STUDIO_APPOINTMENT_REQUESTS_ENABLED: "true",
    NEXT_PUBLIC_STUDIO_APPOINTMENT_REQUESTS_ENABLED: "false",
  }), false);
});

test("Studio account registration has independent privacy and retention approvals", () => {
  const approvedAccounts = {
    STUDIO_DEPLOYMENT: "true",
    NEXT_PUBLIC_STUDIO_DEPLOYMENT: "true",
    STUDIO_ACCOUNT_PRIVACY_APPROVED: "true",
    NEXT_PUBLIC_STUDIO_ACCOUNT_PRIVACY_APPROVED: "true",
    STUDIO_ACCOUNT_RETENTION_POLICY_APPROVED: "true",
    NEXT_PUBLIC_STUDIO_ACCOUNT_RETENTION_POLICY_APPROVED: "true",
    STUDIO_ACCOUNT_DATA_COLLECTION_ENABLED: "true",
    NEXT_PUBLIC_STUDIO_ACCOUNT_DATA_COLLECTION_ENABLED: "true",
  };
  assert.equal(isStudioAccountRegistrationEnabled(approvedAccounts), true);
  assert.equal(isStudioDataCollectionEnabled(approvedAccounts), false);
  assert.equal(isStudioAppointmentCollectionEnabled(approvedAccounts), false);
  assert.equal(isStudioAccountRegistrationEnabled({ ...approvedAccounts, STUDIO_ACCOUNT_RETENTION_POLICY_APPROVED: "false" }), false);
  assert.equal(isStudioAccountRegistrationEnabled({ ...approvedAccounts, NEXT_PUBLIC_STUDIO_ACCOUNT_DATA_COLLECTION_ENABLED: "false" }), false);
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
  for (const pathname of ["/cart", "/checkout", "/product/123", "/account", "/api/mercadopago", "/api/checkout", "/api/admin/orders", "/admin/orders"]) {
    assert.equal(isStudioRouteAllowed(pathname), false, pathname);
  }
});

test("Studio exposes only its customer account and appointment surfaces", () => {
  for (const pathname of ["/register", "/mi-cuenta", "/api/register", "/api/account", "/api/my-appointments", "/admin/clientes", "/api/admin/clients", "/admin/disponibilidad", "/api/admin/availability", "/api/availability"]) {
    assert.equal(isStudioRouteAllowed(pathname), true, pathname);
  }
  for (const pathname of ["/api/orders", "/api/admin/customers", "/admin/customers"]) {
    assert.equal(isStudioRouteAllowed(pathname), false, pathname);
  }
});

test("Studio Google OAuth uses only dedicated Studio credentials", () => {
  const config = getGoogleAuthConfig({
    GOOGLE_CLIENT_ID: "avg-id",
    GOOGLE_CLIENT_SECRET: "avg-secret",
    STUDIO_GOOGLE_CLIENT_ID: "studio-id",
    STUDIO_GOOGLE_CLIENT_SECRET: "studio-secret",
  }, true);
  assert.equal(config.googleEnabled, true);
  assert.equal(config.googleClientId, "studio-id");
  assert.equal(config.googleClientSecret, "studio-secret");
  assert.equal(getGoogleAuthConfig({ GOOGLE_CLIENT_ID: "avg-id", GOOGLE_CLIENT_SECRET: "avg-secret" }, true).googleEnabled, false);
});
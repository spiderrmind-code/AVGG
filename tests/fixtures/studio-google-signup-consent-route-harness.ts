import assert from "node:assert/strict";
import { mock } from "node:test";

process.env.STUDIO_DEPLOYMENT = "true";
process.env.NEXT_PUBLIC_STUDIO_DEPLOYMENT = "true";
process.env.STUDIO_PRIVACY_APPROVED = "true";
process.env.NEXT_PUBLIC_STUDIO_PRIVACY_APPROVED = "true";
process.env.STUDIO_RETENTION_POLICY_APPROVED = "true";
process.env.NEXT_PUBLIC_STUDIO_RETENTION_POLICY_APPROVED = "true";
process.env.STUDIO_DATA_COLLECTION_ENABLED = "true";
process.env.NEXT_PUBLIC_STUDIO_DATA_COLLECTION_ENABLED = "true";
process.env.STUDIO_ACCOUNT_PRIVACY_APPROVED = "true";
process.env.NEXT_PUBLIC_STUDIO_ACCOUNT_PRIVACY_APPROVED = "true";
process.env.STUDIO_ACCOUNT_RETENTION_POLICY_APPROVED = "true";
process.env.NEXT_PUBLIC_STUDIO_ACCOUNT_RETENTION_POLICY_APPROVED = "true";
process.env.STUDIO_ACCOUNT_DATA_COLLECTION_ENABLED = "true";
process.env.NEXT_PUBLIC_STUDIO_ACCOUNT_DATA_COLLECTION_ENABLED = "true";

let limitAllowed = true;
let databaseReads = 0;
const cookies: Array<{ name: string; value: string; options: Record<string, unknown> }> = [];
const database = {};

async function main() {
  await mock.module("next/server", {
    namedExports: {
      NextResponse: {
        json(body: unknown, init?: ResponseInit) {
          const response = Response.json(body, init);
          Object.assign(response, {
            cookies: {
              set(name: string, value: string, options: Record<string, unknown>) {
                cookies.push({ name, value, options });
              },
            },
          });
          return response;
        },
      },
    },
  });
  await mock.module("@/lib/auth-secret", { namedExports: { requireAuthSecret: () => "studio-test-secret" } });
  await mock.module("@/lib/appointments", {
    namedExports: {
      checkAppointmentRateLimit: async () => ({ allowed: limitAllowed, retryAfter: 60 }),
    },
  });
  await mock.module("@/lib/logger", { namedExports: { logServerError: () => undefined } });
  await mock.module("@/lib/request-rate-limit", { namedExports: { requestIdentifier: () => "203.0.113.8" } });
  await mock.module("@/lib/request-security", {
    namedExports: { hasJsonContentType: () => true, hasTrustedOrigin: () => true },
  });
  await mock.module("@/lib/studio-mongo", {
    namedExports: {
      getStudioDb: async () => {
        databaseReads += 1;
        return database;
      },
    },
  });
  await mock.module("@/lib/studio-google-signup-consent", {
    namedExports: {
      createStudioGoogleSignupConsentToken: () => "signed-consent-token",
      studioGoogleSignupConsentCookie: "studio_google_signup_consent",
      studioGoogleSignupConsentMaxAgeSeconds: 600,
    },
  });

  const route = await import("../../app/api/register/google-consent/route");
  const post = (body: Record<string, unknown>) => route.POST(new Request("https://studio.example/api/register/google-consent", {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: "https://studio.example" },
    body: JSON.stringify(body),
  }));

  process.env.STUDIO_ACCOUNT_DATA_COLLECTION_ENABLED = "false";
  process.env.NEXT_PUBLIC_STUDIO_ACCOUNT_DATA_COLLECTION_ENABLED = "false";
  assert.equal((await post({ privacyConsent: true })).status, 503);
  assert.equal(databaseReads, 0);

  process.env.STUDIO_ACCOUNT_DATA_COLLECTION_ENABLED = "true";
  process.env.NEXT_PUBLIC_STUDIO_ACCOUNT_DATA_COLLECTION_ENABLED = "true";
  assert.equal((await post({ privacyConsent: false })).status, 400);
  assert.equal(cookies.length, 0);

  limitAllowed = false;
  assert.equal((await post({ privacyConsent: true })).status, 429);
  assert.equal(cookies.length, 0);

  limitAllowed = true;
  const response = await post({ privacyConsent: true });
  assert.equal(response.status, 200);
  assert.equal(databaseReads, 2);
  assert.deepEqual(cookies[0], {
    name: "studio_google_signup_consent",
    value: "signed-consent-token",
    options: {
      httpOnly: true,
      maxAge: 600,
      path: "/",
      sameSite: "lax",
      secure: true,
    },
  });
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});

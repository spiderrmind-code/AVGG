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
process.env.STUDIO_ADMIN_EMAIL = "admin@studio.test";

const insertedUsers: Record<string, unknown>[] = [];
let studioDatabaseReads = 0;
let avgDatabaseReads = 0;
const database = {
  collection(name: string) {
    if (name !== "users") throw new Error(`Unexpected Studio collection: ${name}`);
    return {
      async findOne(query: { email: string }) {
        return insertedUsers.some((user) => user.email === query.email) ? { _id: "existing" } : null;
      },
      async insertOne(document: Record<string, unknown>) {
        insertedUsers.push(document);
        return { insertedId: "studio-user-1" };
      },
    };
  },
};

async function main() {
  await mock.module("next/server", {
    namedExports: { NextResponse: { json: (body: unknown, init?: ResponseInit) => Response.json(body, init) } },
  });
  await mock.module("@/lib/mongo", {
    namedExports: {
      getDb: async () => {
        avgDatabaseReads += 1;
        throw new Error("AVG database must not be used by Studio");
      },
    },
  });
  await mock.module("@/lib/appointments", {
    namedExports: {
      checkAppointmentRateLimit: async () => ({ allowed: true, retryAfter: 60 }),
      isValidAppointmentPhone: (value: string) => /^\+?[\d\s().-]{7,40}$/.test(value),
      studioPrivacyNoticeVersion: "studio-booking-v1",
    },
  });
  await mock.module("@/lib/auth-secret", { namedExports: { requireAuthSecret: () => "test-studio-secret" } });
  await mock.module("@/lib/request-rate-limit", { namedExports: { requestIdentifier: () => "203.0.113.8" } });
  await mock.module("@/lib/request-security", {
    namedExports: { hasJsonContentType: () => true, hasTrustedOrigin: () => true },
  });
  await mock.module("@/lib/studio-mongo", {
    namedExports: {
      getStudioDb: async () => {
        studioDatabaseReads += 1;
        return database;
      },
    },
  });

  const route = await import("../../app/api/register/route");
  const base = {
    name: "Cliente",
    lastName: "Prueba",
    email: "cliente@studio.test",
    phone: "+54 221 220 3747",
    password: "Password1234!",
    confirmPassword: "Password1234!",
  };
  const post = (body: Record<string, unknown>) => route.POST(new Request("https://studio.example/api/register", {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: "https://studio.example" },
    body: JSON.stringify(body),
  }));

  process.env.STUDIO_ACCOUNT_DATA_COLLECTION_ENABLED = "false";
  process.env.NEXT_PUBLIC_STUDIO_ACCOUNT_DATA_COLLECTION_ENABLED = "false";
  assert.equal((await post({ ...base, privacyConsent: true })).status, 503);
  assert.equal(insertedUsers.length, 0);
  process.env.STUDIO_ACCOUNT_DATA_COLLECTION_ENABLED = "true";
  process.env.NEXT_PUBLIC_STUDIO_ACCOUNT_DATA_COLLECTION_ENABLED = "true";

  assert.equal((await post({ ...base, privacyConsent: false })).status, 400);
  assert.equal(insertedUsers.length, 0);
  const withoutConfirmation = { ...base, confirmPassword: undefined };
  assert.equal((await post({ ...withoutConfirmation, privacyConsent: true })).status, 400);
  assert.equal(insertedUsers.length, 0);
  assert.equal((await post({ ...base, website: "https://bot.invalid", privacyConsent: true })).status, 400);
  assert.equal(insertedUsers.length, 0);
  assert.equal((await post({ ...base, email: "admin@studio.test", privacyConsent: true })).status, 409);
  assert.equal(insertedUsers.length, 0);

  const response = await post({ ...base, privacyConsent: true });
  assert.equal(response.status, 201);
  assert.equal(insertedUsers.length, 1);
  assert.equal(insertedUsers[0]?.role, "customer");
  assert.equal(insertedUsers[0]?.provider, "credentials");
  assert.equal(insertedUsers[0]?.privacyNoticeVersion, "studio-booking-v1");
  assert.notEqual(insertedUsers[0]?.password, base.password);
  assert.equal(studioDatabaseReads, 5);
  assert.equal(avgDatabaseReads, 0);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});

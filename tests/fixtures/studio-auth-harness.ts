import assert from "node:assert/strict";
import bcrypt from "bcryptjs";
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
process.env.STUDIO_NEXTAUTH_SECRET = "test-studio-auth-secret";
process.env.STUDIO_ADMIN_EMAIL = "admin@studio.test";
process.env.STUDIO_GOOGLE_CLIENT_ID = "studio-client-id";
process.env.STUDIO_GOOGLE_CLIENT_SECRET = "studio-client-secret";

const users = new Map<string, Record<string, unknown>>([
  ["customer@studio.test", {
    _id: "studio-user-1",
    email: "customer@studio.test",
    name: "Cliente previo",
    role: "customer",
    password: "valid-hash",
    privacyAcceptedAt: new Date("2026-10-29T00:00:00.000Z"),
  }],
  ["suspended@studio.test", { _id: "studio-user-3", email: "suspended@studio.test", role: "customer", status: "suspended", password: "valid-hash" }],
]);
const linkedAppointments: Array<{ query: Record<string, unknown>; update: Record<string, unknown> }> = [];
let studioDatabaseReads = 0;
let allowGoogleSignup = false;
const database = {
  collection(name: string) {
    if (name === "users") {
      return {
        async findOne(query: { email?: string; _id?: string }) {
          if (query.email) return users.get(query.email) ?? null;
          return [...users.values()].find((user) => user._id === query._id) ?? null;
        },
        async insertOne(document: Record<string, unknown>) {
          const user = { ...document, _id: `studio-user-${users.size + 1}` };
          users.set(String(document.email), user);
          return { insertedId: user._id };
        },
        async updateOne(query: { _id: string }, update: { $set: Record<string, unknown> }) {
          const user = [...users.values()].find((entry) => entry._id === query._id);
          if (!user) return { matchedCount: 0 };
          Object.assign(user, update.$set);
          return { matchedCount: 1 };
        },
      };
    }
    if (name === "appointments") {
      return {
        async updateMany(query: Record<string, unknown>, update: Record<string, unknown>) {
          linkedAppointments.push({ query, update });
          return { matchedCount: 1, modifiedCount: 1 };
        },
      };
    }
    throw new Error(`Unexpected Studio collection: ${name}`);
  },
};

async function main() {
  const passwordHash = await bcrypt.hash("valid-password", 4);
  for (const user of users.values()) user.password = passwordHash;
  await mock.module("@/lib/studio-mongo", {
    namedExports: {
      getStudioDb: async () => {
        studioDatabaseReads += 1;
        return database;
      },
    },
  });
  await mock.module("@/lib/appointments", {
    namedExports: {
      checkAppointmentRateLimit: async () => ({ allowed: true, retryAfter: 60 }),
      isDuplicateKeyError: (error: unknown) => typeof error === "object" && error !== null && "code" in error && error.code === 11000,
      studioPrivacyNoticeVersion: "studio-booking-v1",
    },
  });
  await mock.module("@/lib/studio-google-signup-consent", {
    namedExports: { consumeStudioGoogleSignupConsent: async () => allowGoogleSignup },
  });

  const { authOptions } = await import("../../auth");
  const credentialsProvider = authOptions.providers[0] as unknown as { options: { authorize: (input: Record<string, string>) => Promise<{ id: string; role: string } | null> } };
  const credentials = credentialsProvider.options;
  const activeLogin = await credentials.authorize({ email: "customer@studio.test", password: "valid-password" });
  assert.equal(activeLogin?.role, "customer");
  const suspendedLogin = await credentials.authorize({ email: "suspended@studio.test", password: "valid-password" });
  assert.equal(suspendedLogin, null);
  const signIn = authOptions.callbacks?.signIn;
  assert.ok(signIn);

  const unverifiedUser = { email: "customer@studio.test", name: "Cliente", id: "google-id" };
  const unverified = await signIn({
    user: unverifiedUser,
    account: { provider: "google" },
    profile: { email_verified: false },
  } as never);
  assert.equal(unverified, false);
  assert.equal(users.get("customer@studio.test")?.name, "Cliente previo");

  const accountGateKeys = ["STUDIO_ACCOUNT_PRIVACY_APPROVED", "NEXT_PUBLIC_STUDIO_ACCOUNT_PRIVACY_APPROVED", "STUDIO_ACCOUNT_RETENTION_POLICY_APPROVED", "NEXT_PUBLIC_STUDIO_ACCOUNT_RETENTION_POLICY_APPROVED", "STUDIO_ACCOUNT_DATA_COLLECTION_ENABLED", "NEXT_PUBLIC_STUDIO_ACCOUNT_DATA_COLLECTION_ENABLED"];
  for (const key of accountGateKeys) process.env[key] = "false";
  const existingGoogleCustomer = { email: "customer@studio.test", name: "Cliente", id: "google-id" };
  const existingGoogleLogin = await signIn({
    user: existingGoogleCustomer,
    account: { provider: "google" },
    profile: { email_verified: true },
  } as never);
  assert.equal(existingGoogleLogin, true);
  assert.equal(existingGoogleCustomer.id, "studio-user-1");
  assert.equal(linkedAppointments.length, 0);
  for (const key of accountGateKeys) process.env[key] = "true";

  const customer = { email: "customer@studio.test", name: "Cliente", id: "google-id" };
  const verified = await signIn({
    user: customer,
    account: { provider: "google" },
    profile: { email_verified: true },
  } as never);
  assert.equal(verified, true);
  assert.equal(customer.id, "studio-user-1");
  assert.equal(users.get("customer@studio.test")?.role, "customer");
  assert.equal(linkedAppointments.length, 1);
  assert.deepEqual(linkedAppointments[0]?.query, { email: "customer@studio.test", userId: { $exists: false } });
  assert.deepEqual(linkedAppointments[0]?.update, { $set: { userId: "studio-user-1", updatedAt: (linkedAppointments[0]?.update as { $set: { updatedAt: Date } }).$set.updatedAt } });

  const unconsentedGoogleUser = { email: "new-customer@studio.test", name: "Nueva Cliente", id: "google-id" };
  const unconsentedGoogleSignIn = await signIn({
    user: unconsentedGoogleUser,
    account: { provider: "google" },
    profile: { email_verified: true },
  } as never);
  assert.equal(unconsentedGoogleSignIn, false);
  assert.equal(users.has("new-customer@studio.test"), false);

  allowGoogleSignup = true;
  const newCustomer: { email: string; name: string; id: string; role?: string } = {
    email: "new-customer@studio.test",
    name: "Nueva Cliente",
    id: "google-id",
  };
  const googleRegistration = await signIn({
    user: newCustomer,
    account: { provider: "google" },
    profile: { email_verified: true },
  } as never);
  assert.equal(googleRegistration, true);
  assert.equal(newCustomer.id, "studio-user-3");
  assert.equal(newCustomer.role, "customer");
  assert.equal(users.get("new-customer@studio.test")?.emailVerified, true);
  assert.equal(users.get("new-customer@studio.test")?.privacyNoticeVersion, "studio-booking-v1");
  assert.equal(linkedAppointments.length, 2);

  const adminUser = { email: "admin@studio.test", name: "Admin" };
  const adminGoogleSignIn = await signIn({
    user: adminUser,
    account: { provider: "google" },
    profile: { email_verified: true },
  } as never);
  assert.equal(adminGoogleSignIn, false);
  assert.equal(users.has("admin@studio.test"), false);
  assert.equal(studioDatabaseReads, 8);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});

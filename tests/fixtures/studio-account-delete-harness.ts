import assert from "node:assert/strict";
import { mock } from "node:test";
import { ObjectId } from "mongodb";

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

const userId = "507f1f77bcf86cd799439011";
let session: { user?: { id?: string; email?: string; role?: string } } | null = {
  user: { id: userId, email: "customer@studio.test", role: "customer" },
};
let userExists = true;
let appointmentsUpdated = 0;
const profileUpdates: Array<Record<string, unknown>> = [];
const appointment: Record<string, unknown> = {
  userId,
  name: "Cliente",
  email: "customer@studio.test",
  phone: "+54 221 220 3747",
  idea: "Tatuaje de prueba",
  fingerprint: "private-fingerprint",
  status: "requested",
};

const database = {
  collection(name: string) {
    if (name === "users") {
      return {
        async findOne(query: { _id: ObjectId; email: string; role: string }) {
          return userExists && query._id.toString() === userId && query.email === "customer@studio.test" && query.role === "customer"
            ? { _id: new ObjectId(userId) }
            : null;
        },
        async deleteOne(query: { _id: ObjectId; email: string; role: string }) {
          if (!userExists || query._id.toString() !== userId || query.email !== "customer@studio.test" || query.role !== "customer") {
            return { deletedCount: 0 };
          }
          userExists = false;
          return { deletedCount: 1 };
        },
        async updateOne(_query: Record<string, unknown>, update: { $set: Record<string, unknown> }) {
          profileUpdates.push(update.$set);
          return { matchedCount: userExists ? 1 : 0 };
        },
      };
    }
    if (name === "appointments") {
      return {
        async updateMany(query: { userId: string }, update: { $unset: Record<string, string>; $set: Record<string, unknown> }) {
          assert.equal(query.userId, userId);
          appointmentsUpdated += 1;
          for (const key of Object.keys(update.$unset)) delete appointment[key];
          Object.assign(appointment, update.$set);
          return { modifiedCount: 1 };
        },
      };
    }
    throw new Error(`Unexpected collection: ${name}`);
  },
};

async function main() {
  await mock.module("next/server", {
    namedExports: { NextResponse: { json: (body: unknown, init?: ResponseInit) => Response.json(body, init) } },
  });
  await mock.module("next-auth", { namedExports: { getServerSession: async () => session } });
  await mock.module("@/auth", { namedExports: { authOptions: {} } });
  await mock.module("@/lib/request-security", {
    namedExports: { hasJsonContentType: () => true, hasTrustedOrigin: (request: Request) => request.headers.get("origin") === "https://studio.example" },
  });
  await mock.module("@/lib/studio-mongo", { namedExports: { getStudioDb: async () => database } });
  await mock.module("@/lib/logger", { namedExports: { logServerError: () => undefined } });

  const route = await import("../../app/api/account/route");
  const request = (method: string, body?: Record<string, unknown>, origin = "https://studio.example") => new Request("https://studio.example/api/account", {
    method,
    headers: { Origin: origin, ...(body ? { "Content-Type": "application/json" } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  session = null;
  assert.equal((await route.DELETE(request("DELETE"))).status, 401);
  session = { user: { id: userId, email: "customer@studio.test", role: "admin" } };
  assert.equal((await route.DELETE(request("DELETE"))).status, 401);
  session = { user: { id: userId, email: "customer@studio.test", role: "customer" } };
  const untrustedResponse = await route.DELETE(request("DELETE", undefined, "https://untrusted.example"));
  assert.equal(untrustedResponse.status, 403);

  const invalidPhone = await route.PATCH(request("PATCH", { name: "Cliente", phone: "not a phone" }));
  assert.equal(invalidPhone.status, 400);
  assert.equal(profileUpdates.length, 0);
  const invalidName = await route.PATCH(request("PATCH", { name: "   ", phone: "+54 221 220 3747" }));
  assert.equal(invalidName.status, 400);
  assert.equal(profileUpdates.length, 0);
  const validProfile = await route.PATCH(request("PATCH", { name: "Cliente Actualizado", phone: "+54 221 220 3747" }));
  assert.equal(validProfile.status, 200);
  assert.equal(profileUpdates.length, 1);
  assert.equal(profileUpdates[0]?.name, "Cliente Actualizado");

  const response = await route.DELETE(request("DELETE"));
  assert.equal(response.status, 200);
  assert.equal(userExists, false);
  assert.equal(appointmentsUpdated, 1);
  for (const field of ["userId", "name", "email", "phone", "idea", "fingerprint"]) assert.equal(field in appointment, false);
  assert.ok(appointment.anonymizedAt instanceof Date);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});

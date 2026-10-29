import assert from "node:assert/strict";
import { mock } from "node:test";

process.env.STUDIO_DEPLOYMENT = "true";
process.env.NEXT_PUBLIC_STUDIO_DEPLOYMENT = "true";
process.env.STUDIO_ADMIN_EMAIL = "admin@studio.test";
process.env.STUDIO_NEXTAUTH_SECRET = "test-studio-secret";

type AppointmentRecord = {
  _id: string;
  name: string;
  email: string;
  phone: string;
  style: string;
  idea: string;
  preferredDate: string;
  preferredTime: string;
  status: string;
  updatedAt: Date;
};

let session: { user?: { email?: string; role?: string } } | null = null;
let databaseReads = 0;
const appointment: AppointmentRecord = {
  _id: "507f1f77bcf86cd799439011",
  name: "Prueba ficticia",
  email: "admin-test@example.test",
  phone: "+54 221 220 3747",
  style: "Blackwork",
  idea: "Datos de prueba automatizada",
  preferredDate: "2099-12-31",
  preferredTime: "14:30",
  status: "requested",
  updatedAt: new Date("2026-10-29T12:00:00.000Z"),
};
const slotLocks = new Map<string, { _id: string; appointmentId: string }>();

class TestObjectId {
  constructor(readonly value: string) {}
  static isValid(value: string) {
    return /^[a-f\d]{24}$/i.test(value);
  }
  toString() {
    return this.value;
  }
}

function idValue(value: unknown) {
  return value instanceof TestObjectId ? value.value : value;
}

const database = {
  collection(name: string) {
    if (name === "appointments") {
      return {
        find() {
          return {
            sort() {
              return { toArray: async () => [appointment] };
            },
          };
        },
        async findOne(query: Record<string, unknown>) {
          const id = idValue(query._id);
          if (typeof id === "string" && id !== appointment._id) return null;
          if (query._id && typeof query._id === "object" && "$ne" in query._id && idValue((query._id as { $ne: unknown }).$ne) === appointment._id) return null;
          const status = query.status as { $in?: string[] } | string | undefined;
          if (typeof status === "string" && appointment.status !== status) return null;
          if (status && typeof status !== "string" && !status.$in?.includes(appointment.status)) return null;
          return appointment;
        },
        async updateOne(query: Record<string, unknown>, update: { $set: Partial<AppointmentRecord> }) {
          if (idValue(query._id) !== appointment._id || query.updatedAt !== appointment.updatedAt) return { matchedCount: 0 };
          Object.assign(appointment, update.$set);
          return { matchedCount: 1 };
        },
      };
    }
    if (name === "appointment_submission_locks") {
      return {
        async findOne() { return null; },
        async insertOne() { return; },
        async updateOne() { return; },
        async deleteOne() { return; },
      };
    }
    if (name === "appointment_slot_locks") {
      return {
        async findOne(query: { _id: string }) { return slotLocks.get(query._id) ?? null; },
        async insertOne(document: { _id: string; appointmentId: TestObjectId }) {
          if (slotLocks.has(document._id)) throw { code: 11000 };
          slotLocks.set(document._id, { _id: document._id, appointmentId: document.appointmentId.toString() });
        },
        async deleteOne(query: { _id: string }) { slotLocks.delete(query._id); },
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
  await mock.module("mongodb", { namedExports: { ObjectId: TestObjectId } });
  await mock.module("@/auth", { namedExports: { authOptions: {} } });
  await mock.module("@/lib/appointments", {
    namedExports: {
      isDuplicateKeyError: (error: unknown) => typeof error === "object" && error !== null && "code" in error && error.code === 11000,
      isValidAppointmentDate: (value: unknown) => typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value),
      isValidAppointmentTime: (value: unknown) => typeof value === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(value),
    },
  });
  await mock.module("@/lib/logger", { namedExports: { logServerError: () => undefined } });
  await mock.module("@/lib/studio-mongo", {
    namedExports: {
      getStudioDb: async () => { databaseReads += 1; return database; },
    },
  });
  await mock.module("@/lib/request-security", {
    namedExports: { hasJsonContentType: () => true, hasTrustedOrigin: () => true },
  });

  const route = await import("../../app/api/admin/appointments/route");

  async function get(): Promise<Response> {
    return route.GET();
  }

  async function patch(): Promise<Response> {
    return route.PATCH(new Request("https://studio.example/api/admin/appointments", {
      method: "PATCH",
      headers: { "content-type": "application/json", origin: "https://studio.example" },
      body: JSON.stringify({ id: appointment._id, status: "confirmed", preferredDate: "2099-12-31", preferredTime: "14:30" }),
    }));
  }

  session = null;
  let response: Response = await get();
  assert.equal(response.status, 401);
  response = await patch();
  assert.equal(response.status, 401);
  assert.equal(databaseReads, 0);

  session = { user: { email: "customer@studio.test", role: "customer" } };
  response = await get();
  assert.equal(response.status, 403);
  response = await patch();
  assert.equal(response.status, 403);

  session = { user: { email: "other-admin@studio.test", role: "admin" } };
  response = await get();
  assert.equal(response.status, 403, "an AVG or unlisted admin must not enter the Studio API");
  response = await patch();
  assert.equal(response.status, 403);
  assert.equal(databaseReads, 0);

  session = { user: { email: "admin@studio.test", role: "admin" } };
  response = await get();
  assert.equal(response.status, 200);
  assert.equal((await response.json() as { appointments: AppointmentRecord[] }).appointments.length, 1);
  response = await patch();
  assert.equal(response.status, 200);
  assert.equal(appointment.status, "confirmed");
  assert.equal(slotLocks.has("2099-12-31T14:30"), true);

  process.env.STUDIO_DEPLOYMENT = "false";
  process.env.NEXT_PUBLIC_STUDIO_DEPLOYMENT = "false";
  const readsBeforeNonStudioRequest = databaseReads;
  response = await get();
  assert.equal(response.status, 404);
  assert.equal(databaseReads, readsBeforeNonStudioRequest);

  console.log("studio admin API authorization mock coverage passed");
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});

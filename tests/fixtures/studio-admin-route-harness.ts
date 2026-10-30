import assert from "node:assert/strict";
import { mock } from "node:test";

process.env.STUDIO_DEPLOYMENT = "true";
process.env.NEXT_PUBLIC_STUDIO_DEPLOYMENT = "true";
process.env.STUDIO_ADMIN_EMAIL = "admin@studio.test";
process.env.STUDIO_NEXTAUTH_SECRET = "test-studio-secret";

type AppointmentRecord = {
  _id: string;
  userId?: string;
  name: string;
  email: string;
  phone: string;
  style: string;
  idea: string;
  preferredDate: string;
  preferredTime: string;
  status: string;
  updatedAt: Date;
  expiresAt?: Date;
  cancelledAt?: Date;
  completedAt?: Date;
  lastInteractionAt?: Date;
};

let session: { user?: { email?: string; role?: string } } | null = null;
let databaseReads = 0;
let adminAppointmentProjection: Record<string, number> | undefined;
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
  expiresAt: new Date("2027-01-27T12:00:00.000Z"),
};
const slotLocks = new Map<string, { _id: string; appointmentId: string }>();
const retentionUpdates: Array<{ filter: Record<string, unknown>; update: unknown }> = [];
let savedAvailability: Record<string, unknown> | null = null;
let collideNextSlotInsert = false;
const availability = {
  durationMinutes: 60,
  cancellationNoticeHours: null,
  weeklySchedule: Array.from({ length: 7 }, (_, weekday) => ({ weekday, intervals: [{ start: "00:30", end: "23:30" }] })),
  blockedDates: [],
  retention: { unconfirmedDays: 30, cancelledDays: 30, completedDays: 30 },
};

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
        find(query?: Record<string, unknown>, options?: { projection?: Record<string, number> }) {
          adminAppointmentProjection = options?.projection;
          const cursor = {
            sort() { return cursor; },
            toArray: async () => query && Object.keys(query).length ? [] : [appointment],
          };
          return cursor;
        },
        async findOne(query: Record<string, unknown>) {
          const id = idValue(query._id);
          if (typeof id === "string" && id !== appointment._id) return null;
          if (query._id && typeof query._id === "object" && "$ne" in query._id && idValue((query._id as { $ne: unknown }).$ne) === appointment._id) return null;
          const status = query.status as { $in?: string[] } | string | undefined;
          if (typeof status === "string" && appointment.status !== status) return null;
          if (status && typeof status !== "string" && !status.$in?.includes(appointment.status)) return null;
          return { ...appointment };
        },
        async updateOne(query: Record<string, unknown>, update: { $set: Partial<AppointmentRecord>; $unset?: Record<string, unknown> }) {
          if (idValue(query._id) !== appointment._id || query.updatedAt !== appointment.updatedAt) return { matchedCount: 0 };
          Object.assign(appointment, update.$set);
          for (const key of Object.keys(update.$unset ?? {})) delete appointment[key as keyof AppointmentRecord];
          return { matchedCount: 1 };
        },
        async updateMany(filter: Record<string, unknown>, update: unknown) {
          retentionUpdates.push({ filter, update });
          return { matchedCount: 1 };
        },
      };
    }
    if (name === "studio_settings") return {
      async findOne() { return { _id: "availability", ...availability }; },
      async updateOne(query: Record<string, unknown>, update: { $set: Record<string, unknown> }) {
        savedAvailability = { ...query, ...update.$set };
        return { matchedCount: 1 };
      },
    };
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
          if (collideNextSlotInsert) {
            collideNextSlotInsert = false;
            throw { code: 11000 };
          }
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
      checkAppointmentRateLimit: async () => ({ allowed: true, retryAfter: 60 }),
      studioPrivacyNoticeVersion: "studio-booking-v1",
      isDuplicateKeyError: (error: unknown) => typeof error === "object" && error !== null && "code" in error && error.code === 11000,
      isValidAppointmentDate: (value: unknown) => typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value),
      isValidAppointmentTime: (value: unknown) => typeof value === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(value),
    },
  });
  await mock.module("@/lib/logger", { namedExports: { logServerError: () => undefined } });
  await mock.module("@/lib/auth-secret", { namedExports: { requireAuthSecret: () => "test-studio-secret" } });
  await mock.module("@/lib/request-rate-limit", { namedExports: { requestIdentifier: () => "203.0.113.8" } });
  await mock.module("@/lib/studio-mongo", {
    namedExports: {
      getStudioDb: async () => { databaseReads += 1; return database; },
      isStudioMongoConfigured: () => true,
    },
  });
  await mock.module("@/lib/request-security", {
    namedExports: { hasJsonContentType: () => true, hasTrustedOrigin: () => true },
  });
  await mock.module("@/lib/studio-availability", {
    namedExports: {
      defaultStudioAvailability: { durationMinutes: null, cancellationNoticeHours: null, weeklySchedule: [], blockedDates: [], retention: { unconfirmedDays: null, cancelledDays: null, completedDays: null } },
      validateStudioAvailability: (value: unknown) => ({ valid: true, settings: value }),
      getStudioAvailableStartTimes: () => ["14:30"],
      getStudioAppointmentSlotLockIds: (date: string, time: string) => [`${date}T${time}`],
      getStudioRetentionExpiry: (days: number | null, now: Date) => days === null ? undefined : new Date(now.getTime() + days * 24 * 60 * 60 * 1000),
    },
  });

  const route = await import("../../app/api/admin/appointments/route");

  async function get(): Promise<Response> {
    return route.GET(new Request("https://studio.example/api/admin/appointments"));
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
  assert.deepEqual(adminAppointmentProjection, { name: 1, email: 1, phone: 1, style: 1, idea: 1, preferredDate: 1, preferredTime: 1, status: 1, userId: 1 });
  collideNextSlotInsert = true;
  response = await patch();
  assert.equal(response.status, 409, "a concurrent unique-slot-lock winner must reject the competing confirmation");
  assert.equal(appointment.status, "requested");
  assert.equal(slotLocks.size, 0, "a losing confirmation must not leave partial locks");
  response = await patch();
  assert.equal(response.status, 200);
  assert.equal(appointment.status, "confirmed");
  assert.equal(Object.hasOwn(appointment, "expiresAt"), false, "confirmed appointments must not expire automatically");
  assert.equal(slotLocks.has("2099-12-31T14:30"), true);

  response = await route.PATCH(new Request("https://studio.example/api/admin/appointments", {
    method: "PATCH",
    headers: { "content-type": "application/json", origin: "https://studio.example" },
    body: JSON.stringify({ id: appointment._id, status: "cancelled" }),
  }));
  assert.equal(response.status, 200);
  assert.equal(appointment.status, "cancelled");
  assert.ok(appointment.expiresAt instanceof Date);
  assert.equal(appointment.expiresAt.getTime() - appointment.cancelledAt!.getTime(), 30 * 24 * 60 * 60 * 1000);
  assert.ok(appointment.cancelledAt instanceof Date);
  assert.equal(slotLocks.has("2099-12-31T14:30"), false);

  response = await route.PATCH(new Request("https://studio.example/api/admin/appointments", {
    method: "PATCH",
    headers: { "content-type": "application/json", origin: "https://studio.example" },
    body: JSON.stringify({ id: appointment._id, status: "completed" }),
  }));
  assert.equal(response.status, 200);
  assert.equal(appointment.status, "completed");
  assert.ok(appointment.completedAt instanceof Date);
  assert.equal(appointment.expiresAt.getTime() - appointment.completedAt!.getTime(), 30 * 24 * 60 * 60 * 1000);
  assert.equal(Object.hasOwn(appointment, "cancelledAt"), false);

  const availabilityRoute = await import("../../app/api/admin/availability/route");
  response = await availabilityRoute.PUT(new Request("https://studio.example/api/admin/availability", {
    method: "PUT",
    headers: { "content-type": "application/json", origin: "https://studio.example" },
    body: JSON.stringify({
      durationMinutes: 60,
      cancellationNoticeHours: null,
      weeklySchedule: availability.weeklySchedule,
      blockedDates: [],
      retention: { unconfirmedDays: 45, cancelledDays: 60, completedDays: 90 },
    }),
  }));
  assert.equal(response.status, 200);
  assert.equal(retentionUpdates.length, 3);
  assert.ok(retentionUpdates.every(({ filter }) => filter.privacyNoticeVersion === "studio-booking-v1"));
  assert.deepEqual((savedAvailability as Record<string, unknown>)?._id, "availability");
  assert.deepEqual((savedAvailability as Record<string, unknown>)?.retention, { unconfirmedDays: 45, cancelledDays: 60, completedDays: 90 });

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

import assert from "node:assert/strict";
import { mock } from "node:test";

process.env.STUDIO_DEPLOYMENT = "true";
process.env.NEXT_PUBLIC_STUDIO_DEPLOYMENT = "true";

const customerId = "customer-a";
let session: { user?: { id?: string; email?: string; role?: string } } | null = {
  user: { id: customerId, email: "customer-a@example.test", role: "customer" },
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

const appointments: Array<{ _id: string; userId: string; status: string; preferredDate: string; preferredTime: string; updatedAt: Date; expiresAt?: Date; cancelledAt?: Date }> = [
  { _id: "507f1f77bcf86cd799439011", userId: customerId, status: "requested", preferredDate: "2099-12-31", preferredTime: "14:30", updatedAt: new Date("2026-10-29T12:00:00.000Z") },
  { _id: "507f1f77bcf86cd799439012", userId: customerId, status: "confirmed", preferredDate: "2099-12-31", preferredTime: "15:30", updatedAt: new Date("2026-10-29T12:00:00.000Z") },
  { _id: "507f1f77bcf86cd799439013", userId: "customer-b", status: "requested", preferredDate: "2099-12-31", preferredTime: "16:30", updatedAt: new Date("2026-10-29T12:00:00.000Z") },
];
const slotLocks = new Map([
  ["2099-12-31T15:30", { _id: "2099-12-31T15:30", appointmentId: "507f1f77bcf86cd799439012" }],
]);

function idValue(value: unknown) {
  return value instanceof TestObjectId ? value.value : value;
}

const database = {
  collection(name: string) {
    if (name === "appointments") {
      return {
        find(query: { userId: string }) {
          return {
            sort() {
              return {
                limit() {
                  return { toArray: async () => appointments.filter((item) => item.userId === query.userId) };
                },
              };
            },
          };
        },
        async findOne(query: { _id: unknown; userId: string }) {
          const item = appointments.find((entry) => entry._id === idValue(query._id) && entry.userId === query.userId);
          return item ? { ...item } : null;
        },
        async updateOne(query: { _id: unknown; userId: string; status: string }, update: { $set: Record<string, unknown> }) {
          const item = appointments.find((entry) => entry._id === idValue(query._id) && entry.userId === query.userId && entry.status === query.status);
          if (!item) return { matchedCount: 0 };
          Object.assign(item, update.$set);
          return { matchedCount: 1 };
        },
      };
    }
    if (name === "appointment_slot_locks") {
      return {
        async deleteOne(query: { _id: string; appointmentId: unknown }) {
          const lock = slotLocks.get(query._id);
          if (lock?.appointmentId === String(query.appointmentId)) slotLocks.delete(query._id);
          return { deletedCount: lock ? 1 : 0 };
        },
      };
    }
    if (name === "studio_settings") return { async findOne() { return { _id: "availability", cancellationNoticeHours: null, retention: { unconfirmedDays: null, cancelledDays: 30, completedDays: null } }; } };
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
    },
  });
  await mock.module("@/lib/auth-secret", { namedExports: { requireAuthSecret: () => "test-studio-secret" } });
  await mock.module("@/lib/logger", { namedExports: { logServerError: () => undefined } });
  await mock.module("@/lib/request-rate-limit", { namedExports: { requestIdentifier: () => "203.0.113.8" } });
  await mock.module("@/lib/request-security", {
    namedExports: { hasJsonContentType: () => true, hasTrustedOrigin: () => true },
  });
  await mock.module("@/lib/studio-mongo", { namedExports: { getStudioDb: async () => database } });
  await mock.module("@/lib/studio-availability", {
    namedExports: {
      defaultStudioAvailability: { durationMinutes: null, cancellationNoticeHours: null, weeklySchedule: [], blockedDates: [], retention: { unconfirmedDays: null, cancelledDays: null, completedDays: null } },
      validateStudioAvailability: (value: unknown) => ({ valid: true, settings: value }),
      getStudioRetentionExpiry: (days: number | null, now: Date) => days === null ? undefined : new Date(now.getTime() + days * 24 * 60 * 60 * 1000),
      getStudioAppointmentSlotLockIds: (date: string, time: string) => [`${date}T${time}`],
    },
  });

  const route = await import("../../app/api/my-appointments/route");
  const get = () => route.GET(new Request("https://studio.example/api/my-appointments"));
  const patch = (id: string) => route.PATCH(new Request("https://studio.example/api/my-appointments", {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Origin: "https://studio.example" },
    body: JSON.stringify({ id, action: "cancel" }),
  }));

  const listResponse = await get();
  assert.ok(listResponse);
  const ownAppointments = await listResponse.json() as { appointments: Array<{ userId: string }> };
  assert.equal(ownAppointments.appointments.length, 2);
  assert.ok(ownAppointments.appointments.every((item) => item.userId === customerId));

  const foreignResponse = await patch("507f1f77bcf86cd799439013");
  assert.ok(foreignResponse);
  assert.equal(foreignResponse.status, 404);
  const foreignAppointment = appointments[2];
  assert.ok(foreignAppointment);
  assert.equal(foreignAppointment.status, "requested");

  const ownResponse = await patch("507f1f77bcf86cd799439012");
  assert.ok(ownResponse);
  assert.equal(ownResponse.status, 200);
  const ownAppointment = appointments[1];
  assert.ok(ownAppointment);
  assert.equal(ownAppointment.status, "cancelled");
  assert.ok(ownAppointment.expiresAt instanceof Date);
  assert.equal(ownAppointment.expiresAt.getTime() - ownAppointment.cancelledAt!.getTime(), 30 * 24 * 60 * 60 * 1000);
  assert.ok(ownAppointment.cancelledAt instanceof Date);
  assert.equal(slotLocks.size, 0);

  session = null;
  const unauthenticatedResponse = await get();
  assert.ok(unauthenticatedResponse);
  assert.equal(unauthenticatedResponse.status, 401);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});

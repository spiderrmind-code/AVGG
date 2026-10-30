import assert from "node:assert/strict";
import { mock } from "node:test";
import {
  isDuplicateKeyError,
  isValidAppointmentDate,
  isValidAppointmentPhone,
  isValidAppointmentStyle,
  isValidAppointmentTime,
} from "../../lib/appointments";

const studioEnvironmentKeys = [
  "STUDIO_DEPLOYMENT",
  "NEXT_PUBLIC_STUDIO_DEPLOYMENT",
  "STUDIO_PRIVACY_APPROVED",
  "NEXT_PUBLIC_STUDIO_PRIVACY_APPROVED",
  "STUDIO_RETENTION_POLICY_APPROVED",
  "NEXT_PUBLIC_STUDIO_RETENTION_POLICY_APPROVED",
  "STUDIO_DATA_COLLECTION_ENABLED",
  "NEXT_PUBLIC_STUDIO_DATA_COLLECTION_ENABLED",
  "STUDIO_APPOINTMENT_REQUESTS_ENABLED",
  "NEXT_PUBLIC_STUDIO_APPOINTMENT_REQUESTS_ENABLED",
] as const;
const originalStudioEnvironment = new Map(studioEnvironmentKeys.map((key) => [key, process.env[key]]));

process.env.STUDIO_DEPLOYMENT = "true";
process.env.NEXT_PUBLIC_STUDIO_DEPLOYMENT = "true";
process.env.STUDIO_PRIVACY_APPROVED = "true";
process.env.NEXT_PUBLIC_STUDIO_PRIVACY_APPROVED = "true";
process.env.STUDIO_RETENTION_POLICY_APPROVED = "true";
process.env.NEXT_PUBLIC_STUDIO_RETENTION_POLICY_APPROVED = "true";
process.env.STUDIO_DATA_COLLECTION_ENABLED = "true";
process.env.NEXT_PUBLIC_STUDIO_DATA_COLLECTION_ENABLED = "true";
process.env.STUDIO_APPOINTMENT_REQUESTS_ENABLED = "true";
process.env.NEXT_PUBLIC_STUDIO_APPOINTMENT_REQUESTS_ENABLED = "true";

type Appointment = Record<string, unknown> & { fingerprint: string; status: string };
type Lock = { _id: string; createdAt: Date; appointmentId?: string };

const saved: Appointment[] = [];
const locks = new Map<string, Lock>();
let failInsert = false;
let events = 0;
const availability = {
  durationMinutes: 60,
  cancellationNoticeHours: null,
  weeklySchedule: Array.from({ length: 7 }, (_, weekday) => ({ weekday, intervals: [{ start: "00:30", end: "23:30" }] })),
  blockedDates: [],
  retention: { unconfirmedDays: 30, cancelledDays: null, completedDays: null },
};

const database = {
  collection(name: string) {
    if (name === "appointments") {
      return {
        find() {
          return { toArray: async () => [] };
        },
        async findOne(query: Record<string, unknown>) {
          return saved.find((appointment) => {
            if (query.fingerprint && appointment.fingerprint !== query.fingerprint) return false;
            const status = query.status as { $in?: string[] } | string | undefined;
            return !status || (typeof status === "string" ? appointment.status === status : status.$in?.includes(appointment.status));
          }) ?? null;
        },
        async insertOne(document: Appointment) {
          if (failInsert) throw new Error("mock insert failure");
          saved.push(document);
          return { insertedId: "appointment-id" };
        },
      };
    }
    if (name === "studio_settings") return { async findOne() { return { _id: "availability", ...availability }; } };
    if (name === "appointment_submission_locks") {
      return {
        async findOne(query: { _id: string }) {
          return locks.get(query._id) ?? null;
        },
        async insertOne(document: Lock) {
          if (locks.has(document._id)) throw { code: 11000 };
          locks.set(document._id, document);
        },
        async updateOne(query: { _id: string }, update: { $set: { appointmentId: string } }) {
          const current = locks.get(query._id);
          if (current) current.appointmentId = update.$set.appointmentId;
        },
        async deleteOne(query: { _id: string }) {
          locks.delete(query._id);
        },
      };
    }
    return { async updateOne() { events += 1; } };
  },
};

async function main() {
  try {
  await mock.module("next/server", {
    namedExports: { NextResponse: { json: (body: unknown, init?: ResponseInit) => Response.json(body, init) } },
  });
  await mock.module("next-auth", { namedExports: { getServerSession: async () => null } });
  await mock.module("@/auth", { namedExports: { authOptions: {} } });
  await mock.module("@/lib/appointments", {
    namedExports: {
      checkAppointmentRateLimit: async () => ({ allowed: true, retryAfter: 60 }),
      isDuplicateKeyError,
      isValidAppointmentDate,
      isValidAppointmentPhone,
      isValidAppointmentStyle,
      isValidAppointmentTime,
      studioPrivacyNoticeVersion: "studio-booking-v1",
    },
  });
  await mock.module("@/lib/auth-secret", { namedExports: { requireAuthSecret: () => "test-secret" } });
  await mock.module("@/lib/logger", { namedExports: { logServerError: () => undefined } });
  await mock.module("@/lib/studio-mongo", {
    namedExports: { getStudioDb: async () => database, isStudioMongoConfigured: () => true },
  });
  await mock.module("@/lib/request-rate-limit", { namedExports: { requestIdentifier: () => "203.0.113.8" } });
  await mock.module("@/lib/request-security", {
    namedExports: { hasJsonContentType: () => true, hasTrustedOrigin: () => true },
  });
  await mock.module("@/lib/studio-analytics", {
    namedExports: { recordStudioEvent: async () => { events += 1; } },
  });
  await mock.module("@/lib/studio-availability", {
    namedExports: {
      validateStudioAvailability: (value: unknown) => ({ valid: true, settings: value }),
      getStudioAvailableStartTimes: () => ["14:30"],
      getStudioRetentionExpiry: (days: number | null, now: Date) => days === null ? undefined : new Date(now.getTime() + days * 24 * 60 * 60 * 1000),
    },
  });

  const route = await import("../../app/api/appointments/route");
  const validRequest = {
    name: "Prueba ficticia",
    email: "studio-test@example.test",
    phone: "+54 221 220 3747",
    style: "Blackwork",
    idea: "Diseño de prueba automatizada",
    preferredDate: "2099-12-31",
    preferredTime: "14:30",
    privacyConsent: "on",
  };

  async function post(data: Record<string, unknown>) {
    return route.POST(new Request("https://studio.example/api/appointments", {
      method: "POST",
      headers: { "content-type": "application/json", origin: "https://studio.example" },
      body: JSON.stringify(data),
    }));
  }

  let response = await post(validRequest);
  assert.equal(response.status, 201);
  assert.equal(saved.length, 1, "success must follow the persisted appointment");
  assert.equal(saved[0]?.status, "requested", "a request must not be automatically confirmed");
  assert.equal(saved[0]?.privacyNoticeVersion, "studio-booking-v1");
  assert.ok(saved[0]?.privacyAcceptedAt instanceof Date);
  assert.ok(saved[0]?.expiresAt instanceof Date);
  assert.equal((saved[0]?.expiresAt as Date).getTime() - (saved[0]?.createdAt as Date).getTime(), 30 * 24 * 60 * 60 * 1000);
  assert.match((await response.json() as { message: string }).message, /no significa|revisará.*confirmar/i);

  response = await post(validRequest);
  assert.equal(response.status, 409);
  assert.equal(saved.length, 1, "duplicate requests must not create another record");

  for (const invalid of [
    { ...validRequest, preferredDate: "2099-02-31" },
    { ...validRequest, preferredTime: "24:00" },
    { ...validRequest, phone: "123" },
    { ...validRequest, style: "No existente" },
    { ...validRequest, email: "bad-email" },
    { ...validRequest, privacyConsent: undefined },
  ]) {
    response = await post(invalid);
    assert.equal(response.status, 400);
  }
  assert.equal(saved.length, 1, "invalid requests must not be persisted");

  process.env.STUDIO_DATA_COLLECTION_ENABLED = "false";
  process.env.NEXT_PUBLIC_STUDIO_DATA_COLLECTION_ENABLED = "false";
  response = await post({ ...validRequest, idea: "Privacidad pendiente" });
  assert.equal(response.status, 503);
  assert.equal(saved.length, 1, "collection must stay disabled until both approval flags are enabled");
  process.env.STUDIO_DATA_COLLECTION_ENABLED = "true";
  process.env.NEXT_PUBLIC_STUDIO_DATA_COLLECTION_ENABLED = "true";

  failInsert = true;
  response = await post({ ...validRequest, idea: "Error de escritura simulado" });
  assert.equal(response.status, 500);
  assert.equal(saved.length, 1, "a failed write must never return success");
  assert.equal(events, 1, "analytics runs only after a persisted request");

  process.env.NEXT_PUBLIC_STUDIO_DEPLOYMENT = "false";
  response = await post({ ...validRequest, idea: "Flags inconsistentes" });
  assert.equal(response.status, 503);
  assert.equal(saved.length, 1, "inconsistent deployment flags must not write");

  process.env.STUDIO_DEPLOYMENT = "false";
  response = await post({ ...validRequest, idea: "Ruta no disponible en AVG" });
  assert.equal(response.status, 404);
  assert.equal(saved.length, 1, "AVG deployment must not expose Studio persistence");

    console.log("studio appointment API mock coverage passed");
  } finally {
    for (const key of studioEnvironmentKeys) {
      const original = originalStudioEnvironment.get(key);
      if (original === undefined) delete process.env[key];
      else process.env[key] = original;
    }
  }
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});

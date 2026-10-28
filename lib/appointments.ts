import { createHmac } from "crypto";
import type { Db } from "mongodb";

const studioDate = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Argentina/Buenos_Aires",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export function getStudioDate(now = new Date()): string {
  return studioDate.format(now);
}

export function isValidAppointmentDate(value: unknown, now = new Date(), allowPast = false): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T12:00:00.000Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) return false;
  return allowPast || value >= getStudioDate(now);
}

export function isValidAppointmentTime(value: unknown): value is string {
  return typeof value === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

export function isDuplicateKeyError(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === 11000;
}

export function appointmentRateLimitKey(identifier: string, secret: string): string {
  return createHmac("sha256", secret).update(identifier).digest("hex");
}

export async function checkAppointmentRateLimit(db: Db, identifier: string, secret: string, limit = 5, windowMs = 10 * 60 * 1000, now = Date.now()) {
  const key = appointmentRateLimitKey(identifier, secret);
  const windowEnd = new Date((Math.floor(now / windowMs) + 1) * windowMs);
  const currentTime = new Date(now);
  const counters = db.collection<{ _id: string; count: number; resetAt: Date }>("appointment_rate_limits");
  const update = [{ $set: {
    count: { $cond: [{ $gt: ["$resetAt", currentTime] }, { $add: [{ $ifNull: ["$count", 0] }, 1] }, 1] },
    resetAt: { $cond: [{ $gt: ["$resetAt", currentTime] }, "$resetAt", windowEnd] },
  } }];

  let counter;
  try {
    counter = await counters.findOneAndUpdate({ _id: key }, update, { upsert: true, returnDocument: "after" });
  } catch (error) {
    if (!isDuplicateKeyError(error)) throw error;
    counter = await counters.findOneAndUpdate({ _id: key }, update, { returnDocument: "after" });
  }

  const count = counter?.count ?? limit + 1;
  return { allowed: count <= limit, retryAfter: Math.max(1, Math.ceil((windowEnd.getTime() - now) / 1000)) };
}
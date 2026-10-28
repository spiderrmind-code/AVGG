import assert from "node:assert/strict";
import test from "node:test";
import { appointmentRateLimitKey, getStudioDate, isDuplicateKeyError, isValidAppointmentDate, isValidAppointmentTime } from "../lib/appointments";
import { isStudioAnalyticsEvent } from "../lib/studio-analytics";

const now = new Date("2026-10-27T15:00:00-03:00");

test("appointment dates reject impossible and past days", () => {
  assert.equal(getStudioDate(now), "2026-10-27");
  assert.equal(isValidAppointmentDate("2026-02-31", now), false);
  assert.equal(isValidAppointmentDate("2026-10-26", now), false);
  assert.equal(isValidAppointmentDate("2026-10-27", now), true);
  assert.equal(isValidAppointmentDate("2024-02-29", now, true), true);
});

test("appointment times must use a real 24-hour time", () => {
  assert.equal(isValidAppointmentTime("09:30"), true);
  assert.equal(isValidAppointmentTime("24:00"), false);
  assert.equal(isValidAppointmentTime("9:30"), false);
});

test("duplicate Mongo keys are recognized without exposing details", () => {
  assert.equal(isDuplicateKeyError({ code: 11000 }), true);
  assert.equal(isDuplicateKeyError({ code: 11001 }), false);
  assert.equal(isDuplicateKeyError(null), false);
});

test("studio analytics accepts only the privacy-safe event names", () => {
  assert.equal(isStudioAnalyticsEvent("booking_cta_click"), true);
  assert.equal(isStudioAnalyticsEvent("appointment_request_saved"), true);
  assert.equal(isStudioAnalyticsEvent("email"), false);
});

test("appointment rate limit keys do not expose the source identifier", () => {
  const key = appointmentRateLimitKey("203.0.113.8", "temporary-test-secret");
  assert.equal(key.length, 64);
  assert.equal(key.includes("203.0.113.8"), false);
  assert.equal(key, appointmentRateLimitKey("203.0.113.8", "temporary-test-secret"));
});
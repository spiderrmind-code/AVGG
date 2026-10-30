import assert from "node:assert/strict";
import test from "node:test";
import {
  defaultStudioAvailability,
  getStudioAppointmentSlotLockIds,
  getStudioAvailableStartTimes,
  getStudioRetentionExpiry,
  validateStudioAvailability,
  type StudioAvailabilitySettings,
} from "../lib/studio-availability";

const settings: StudioAvailabilitySettings = {
  durationMinutes: 60,
  cancellationNoticeHours: null,
  weeklySchedule: [
    { weekday: 0, intervals: [] },
    { weekday: 1, intervals: [{ start: "09:00", end: "13:00" }, { start: "14:00", end: "18:00" }] },
    { weekday: 2, intervals: [] },
    { weekday: 3, intervals: [] },
    { weekday: 4, intervals: [] },
    { weekday: 5, intervals: [] },
    { weekday: 6, intervals: [] },
  ],
  blockedDates: [],
  retention: { unconfirmedDays: null, cancelledDays: null, completedDays: null },
};

test("Studio availability defaults closed and validates seven-day schedule and duration", () => {
  assert.equal(defaultStudioAvailability.weeklySchedule.every((day) => day.intervals.length === 0), true);
  assert.equal(defaultStudioAvailability.durationMinutes, null);
  assert.deepEqual(defaultStudioAvailability.retention, { unconfirmedDays: null, cancelledDays: null, completedDays: null });
  assert.equal(validateStudioAvailability(settings).valid, true);
  assert.equal(validateStudioAvailability({ ...settings, durationMinutes: 20 }).valid, false);
  assert.equal(validateStudioAvailability({ ...settings, blockedDates: ["2026-02-31"] }).valid, false);
  assert.equal(validateStudioAvailability({
    ...settings,
    weeklySchedule: settings.weeklySchedule.map((day) => day.weekday === 1
      ? { ...day, intervals: [{ start: "09:10", end: "12:00" }] }
      : day),
  }).valid, false);
  assert.equal(validateStudioAvailability({
    ...settings,
    weeklySchedule: settings.weeklySchedule.map((day) => day.weekday === 1
      ? { ...day, intervals: [{ start: "09:00", end: "12:00" }, { start: "11:00", end: "14:00" }] }
      : day),
  }).valid, false);
  assert.equal(validateStudioAvailability({ ...settings, retention: { ...settings.retention, completedDays: 0 } }).valid, false);
  assert.equal(validateStudioAvailability({ ...settings, retention: { ...settings.retention, unconfirmedDays: 3651 } }).valid, false);
  assert.equal(validateStudioAvailability({ ...settings, retention: { ...settings.retention, cancelledDays: 30 } }).valid, true);
});

test("Studio retention expiry remains unset until an explicit policy is configured", () => {
  const now = new Date("2026-10-29T12:00:00.000Z");
  assert.equal(getStudioRetentionExpiry(null, now), undefined);
  assert.equal(getStudioRetentionExpiry(30, now)?.toISOString(), "2026-11-28T12:00:00.000Z");
});

test("Studio available slots respect breaks, blocked days, current time, and confirmed bookings", () => {
  const monday = new Date("2026-10-26T08:00:00-03:00");
  assert.deepEqual(getStudioAvailableStartTimes("2026-10-26", settings, [], monday), ["09:00", "10:00", "11:00", "12:00", "14:00", "15:00", "16:00", "17:00"]);
  assert.deepEqual(
    getStudioAvailableStartTimes("2026-10-26", settings, [{ preferredDate: "2026-10-26", preferredTime: "10:00" }], monday),
    ["09:00", "11:00", "12:00", "14:00", "15:00", "16:00", "17:00"],
  );
  assert.deepEqual(getStudioAvailableStartTimes("2026-10-26", { ...settings, blockedDates: ["2026-10-26"] }, [], monday), []);
  assert.deepEqual(getStudioAvailableStartTimes("2026-10-26", settings, [], new Date("2026-10-26T12:30:00-03:00")), ["14:00", "15:00", "16:00", "17:00"]);
});

test("Studio overlap lock IDs cover every 15-minute interval of a reservation", () => {
  assert.deepEqual(getStudioAppointmentSlotLockIds("2026-10-26", "09:30", 60), [
    "2026-10-26T09:30",
    "2026-10-26T09:45",
    "2026-10-26T10:00",
    "2026-10-26T10:15",
  ]);
});

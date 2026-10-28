import type { Db } from "mongodb";

export const studioAnalyticsEvents = ["booking_cta_click", "appointment_request_saved"] as const;
export type StudioAnalyticsEvent = (typeof studioAnalyticsEvents)[number];

export function isStudioAnalyticsEvent(value: unknown): value is StudioAnalyticsEvent {
  return typeof value === "string" && studioAnalyticsEvents.includes(value as StudioAnalyticsEvent);
}

export async function recordStudioEvent(db: Db, event: StudioAnalyticsEvent, now = new Date()) {
  const date = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Argentina/Buenos_Aires",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
  const id = `${date}:${event}`;
  await db.collection<{ _id: string; event: StudioAnalyticsEvent; date: string; count: number }>("studio_analytics").updateOne(
    { _id: id },
    { $setOnInsert: { event, date }, $inc: { count: 1 } },
    { upsert: true },
  );
}
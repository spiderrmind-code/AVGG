import { logServerWarning, sanitizeLogContext } from "@/lib/logger";
const recent = new Map<string, number>();
export function notifyOperationalAlert(code: string, context: Record<string, string | number | boolean | null | undefined> = {}) {
  if (process.env.ALERTS_ENABLED !== "true") return false;
  const now = Date.now(); if ((recent.get(code) ?? 0) + 300_000 > now) return false; recent.set(code, now);
  logServerWarning("operational_alert", { code, ...sanitizeLogContext(context) }); return true;
}

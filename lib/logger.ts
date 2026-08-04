type LogValue = string | number | boolean | null | undefined;
type LogContext = Record<string, LogValue>;
export type OperationalError = { code: string; message: string; retriable: boolean; severity: "low" | "medium" | "high" | "critical"; source: string };

function maskEmail(value: string): string {
  const at = value.indexOf("@");
  if (at < 1) return "[redacted]";
  return `${value.slice(0, 1)}***${value.slice(at)}`;
}

export function sanitizeLogContext(context: LogContext): Record<string, string | number | boolean | null> {
  const sanitized: Record<string, string | number | boolean | null> = {};
  for (const [key, value] of Object.entries(context)) {
    const normalized = key.toLowerCase();
    if (/(token|secret|password|cookie|authorization|mongodb_uri|mongo_uri|api.?key|address|phone)/.test(normalized)) continue;
    if (normalized.includes("email") && typeof value === "string") sanitized[key] = maskEmail(value);
    else if (value !== undefined) sanitized[key] = value;
  }
  return sanitized;
}

export function logServerError(event: string, context: LogContext = {}): void {
  write("error", event, context);
}

export function logServerEvent(event: string, context: LogContext = {}): void {
  write("info", event, context);
}

export function logServerWarning(event: string, context: LogContext = {}): void { write("warn", event, context); }
export function logServerDebug(event: string, context: LogContext = {}): void { if (process.env.NODE_ENV !== "production") write("debug", event, context); }

function write(level: "debug" | "info" | "warn" | "error", event: string, context: LogContext) {
  const payload = sanitizeLogContext({ timestamp: new Date().toISOString(), level, event, ...context });
  if (process.env.NODE_ENV === "production") console[level](JSON.stringify(payload));
  else console[level](`[${level}] ${event}`, payload);
}

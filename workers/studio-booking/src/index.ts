export interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  run<T = Record<string, unknown>>(): Promise<{ success: boolean; meta: { changes: number }; results: T[] }>;
}

export interface D1Database {
  prepare(query: string): D1PreparedStatement;
  batch<T = unknown>(statements: D1PreparedStatement[]): Promise<{ success: boolean; meta: { changes: number }; results: T[] }[]>;
}

type Env = { DB: D1Database; STUDIO_WORKER_SHARED_SECRET: string };
type Booking = { name: string; email: string; phone: string; style: string; idea: string; preferredDate: string; preferredTime: string; durationMinutes: number; privacyNoticeVersion: string };

const styles = new Set(["Sin preferencia", "Fine line", "Blackwork", "Color", "Ornamental", "Otro"]);
const encoder = new TextEncoder();

function json(value: unknown, status = 200) {
  return new Response(JSON.stringify(value), { status, headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" } });
}

function validDate(value: unknown) { return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T12:00:00Z`)); }
function validTime(value: unknown) { return typeof value === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(value); }
function value(input: unknown, maximum: number) { return typeof input === "string" && input.trim().length > 0 && input.trim().length <= maximum ? input.trim() : null; }

async function digest(secret: string, value: string) {
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(value));
  return [...new Uint8Array(signature)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function authorized(request: Request, env: Env, body: string) {
  const timestamp = request.headers.get("x-studio-timestamp") ?? "";
  const signature = request.headers.get("x-studio-signature") ?? "";
  const milliseconds = Date.parse(timestamp);
  if (!timestamp || !signature || !Number.isFinite(milliseconds) || Math.abs(Date.now() - milliseconds) > 60_000) return false;
  const expected = await digest(env.STUDIO_WORKER_SHARED_SECRET, `${timestamp}.${body}`);
  if (signature.length !== expected.length) return false;
  let difference = 0;
  for (let index = 0; index < signature.length; index += 1) difference |= signature.charCodeAt(index) ^ expected.charCodeAt(index);
  return difference === 0;
}

function slots(date: string, time: string, duration: number) {
  const [hours, minutes] = time.split(":").map(Number);
  const result: string[] = [];
  for (let offset = 0; offset < duration; offset += 15) {
    const total = hours * 60 + minutes + offset;
    result.push(`${date}T${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`);
  }
  return result;
}

async function createAppointment(request: Request, env: Env) {
  const raw = await request.text();
  if (raw.length > 10_000 || !await authorized(request, env, raw)) return json({ message: "No autorizado" }, 401);
  let input: Record<string, unknown>;
  try { input = JSON.parse(raw) as Record<string, unknown>; } catch { return json({ message: "Solicitud inválida" }, 400); }
  const booking: Booking = {
    name: value(input.name, 100) ?? "", email: (value(input.email, 254) ?? "").toLowerCase(), phone: value(input.phone, 40) ?? "",
    style: typeof input.style === "string" ? input.style : "", idea: value(input.idea, 2000) ?? "",
    preferredDate: value(input.preferredDate, 10) ?? "", preferredTime: value(input.preferredTime, 5) ?? "",
    durationMinutes: Number(input.durationMinutes), privacyNoticeVersion: value(input.privacyNoticeVersion, 80) ?? "",
  };
  if (!booking.name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(booking.email) || !/^\+?[\d\s().-]{7,40}$/.test(booking.phone)
    || !styles.has(booking.style) || !booking.idea || !validDate(booking.preferredDate) || !validTime(booking.preferredTime)
    || !Number.isInteger(booking.durationMinutes) || booking.durationMinutes < 15 || booking.durationMinutes > 480 || booking.durationMinutes % 15 !== 0 || !booking.privacyNoticeVersion) {
    return json({ message: "Solicitud inválida" }, 400);
  }
  const now = new Date().toISOString();
  const fingerprint = await digest(env.STUDIO_WORKER_SHARED_SECRET, JSON.stringify([booking.email, booking.preferredDate, booking.preferredTime, booking.idea]));
  const id = crypto.randomUUID();
  const statements = [
    env.DB.prepare("INSERT INTO studio_appointments (id, name, email, phone, style, idea, preferred_date, preferred_time, duration_minutes, fingerprint, privacy_notice_version, privacy_accepted_at, status, created_at, updated_at, last_interaction_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'requested', ?, ?, ?)")
      .bind(id, booking.name, booking.email, booking.phone, booking.style, booking.idea, booking.preferredDate, booking.preferredTime, booking.durationMinutes, fingerprint, booking.privacyNoticeVersion, now, now, now, now),
    ...slots(booking.preferredDate, booking.preferredTime, booking.durationMinutes).map((slot) => env.DB.prepare("INSERT INTO studio_slot_locks (slot_id, appointment_id, created_at) VALUES (?, ?, ?)").bind(slot, id, now)),
  ];
  try {
    await env.DB.batch(statements);
    return json({ id, status: "requested" }, 201);
  } catch {
    return json({ message: "El horario ya no está disponible o la solicitud está duplicada" }, 409);
  }
}

const worker = {
  async fetch(request: Request, env: Env) {
    const url = new URL(request.url);
    if (request.method === "GET" && url.pathname === "/health") return json({ status: "ok", service: "13-studio-booking-worker" });
    if (request.method === "POST" && url.pathname === "/v1/appointments") return createAppointment(request, env);
    return json({ message: "No encontrado" }, 404);
  },
};

export default worker;

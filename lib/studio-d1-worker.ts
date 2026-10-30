import { createHmac, randomUUID } from "crypto";

export type StudioD1WorkerConfig = { url: string; sharedSecret: string };
export type StudioD1BookingInput = {
  name: string; email: string; phone: string; style: string; idea: string;
  preferredDate: string; preferredTime: string; durationMinutes: number; privacyNoticeVersion: string;
};

export function resolveStudioD1WorkerConfig(environment: Partial<NodeJS.ProcessEnv> = process.env): StudioD1WorkerConfig | undefined {
  const url = environment.STUDIO_D1_WORKER_URL?.trim();
  const sharedSecret = environment.STUDIO_D1_WORKER_SHARED_SECRET?.trim();
  if (!url && !sharedSecret) return undefined;
  if (!url || !sharedSecret || sharedSecret.length < 32) throw new Error("La configuración D1 de Studio es inválida");
  const parsed = new URL(url);
  if (parsed.protocol !== "https:" || parsed.username || parsed.password || parsed.search || parsed.hash) throw new Error("La URL del Worker D1 debe ser HTTPS y no incluir credenciales");
  return { url: parsed.toString().replace(/\/$/, ""), sharedSecret };
}

export async function createStudioD1Appointment(config: StudioD1WorkerConfig, input: StudioD1BookingInput, fetcher: typeof fetch = fetch) {
  const body = JSON.stringify(input);
  const timestamp = new Date().toISOString();
  const signature = createHmac("sha256", config.sharedSecret).update(`${timestamp}.${body}`).digest("hex");
  const response = await fetcher(`${config.url}/v1/appointments`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Studio-Timestamp": timestamp, "X-Studio-Signature": signature, "Idempotency-Key": randomUUID() },
    body,
    cache: "no-store",
  });
  const result: unknown = await response.json().catch(() => ({}));
  return { response, result };
}

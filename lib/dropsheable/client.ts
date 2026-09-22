import { requireServerEnvironment } from "@/lib/env";

const DROPSHEABLE_BASE_URL = "https://dropsheable.com.ar/frontv2/api/v1";
const REQUEST_LIMIT = 60;
const REQUEST_WINDOW_MS = 60_000;
const requestTimestamps: number[] = [];

export class DropsheableConfigurationError extends Error {
  readonly status = 503;

  constructor() {
    super("Dropsheable no está configurado");
    this.name = "DropsheableConfigurationError";
  }
}

export class DropsheableApiError extends Error {
  constructor(readonly status: number, readonly responseBody: unknown, readonly retryAfter?: number) {
    super(`Dropsheable respondió con HTTP ${status}`);
    this.name = "DropsheableApiError";
  }
}

function waitForRateLimit(now = Date.now()) {
  while (requestTimestamps[0] !== undefined && now - requestTimestamps[0] >= REQUEST_WINDOW_MS) requestTimestamps.shift();
  if (requestTimestamps.length >= REQUEST_LIMIT) {
    const retryAfter = Math.max(1, Math.ceil((requestTimestamps[0] + REQUEST_WINDOW_MS - now) / 1000));
    throw new DropsheableApiError(429, { error: "Límite local de Dropsheable alcanzado" }, retryAfter);
  }
  requestTimestamps.push(now);
}

async function responseBody(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return null;
  try { return JSON.parse(text) as unknown; } catch { return text; }
}

export async function requestDropsheable(path: string, init: RequestInit = {}) {
  let apiKey: string;
  try {
    apiKey = requireServerEnvironment("DROPSHEABLE_API_KEY");
  } catch {
    throw new DropsheableConfigurationError();
  }

  waitForRateLimit();
  let response: Response;
  try {
    response = await fetch(`${DROPSHEABLE_BASE_URL}${path}`, {
      ...init,
      cache: "no-store",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${apiKey}`,
        ...init.headers,
      },
    });
  } catch {
    throw new DropsheableApiError(502, { error: "No se pudo conectar con Dropsheable" });
  }
  if (!response.ok) {
    const body = await responseBody(response);
    const retryAfterValue = response.headers.get("retry-after");
    const retryAfter = retryAfterValue ? Number(retryAfterValue) : undefined;
    throw new DropsheableApiError(response.status, body, Number.isFinite(retryAfter) ? retryAfter : undefined);
  }
  return response;
}

export type DropsheableProductsQuery = { offset?: number };

export async function getDropsheableProducts(query: DropsheableProductsQuery = {}) {
  const params = new URLSearchParams();
  if (query.offset !== undefined) params.set("offset", String(query.offset));
  const suffix = params.size ? `?${params.toString()}` : "";
  const response = await requestDropsheable(`/productos${suffix}`);
  return responseBody(response);
}

export async function getDropsheableStock() {
  const response = await requestDropsheable("/stock");
  return responseBody(response);
}
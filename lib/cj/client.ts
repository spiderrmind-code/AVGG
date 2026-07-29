type CjRecord = Record<string, unknown>;

export class CjError extends Error {
  constructor(message: string, readonly status = 502) { super(message); this.name = "CjError"; }
}

type TokenCache = { value: string; expiresAt: number };
let tokenCache: TokenCache | undefined;
let tokenRequest: Promise<string> | undefined;
const BASE_URL = "https://developers.cjdropshipping.com/api2.0/v1";
const DEFAULT_TOKEN_TTL_MS = 25 * 60 * 1000;

function asRecord(value: unknown): CjRecord | null {
  return value && typeof value === "object" ? value as CjRecord : null;
}

function tokenFromResponse(value: unknown) {
  const record = asRecord(value);
  const data = asRecord(record?.data);
  const valueToken = data?.accessToken;
  const expiresIn = Number(data?.expiresIn ?? data?.expireIn ?? DEFAULT_TOKEN_TTL_MS / 1000);
  if (!record || (record.result !== true && record.success !== true) || typeof valueToken !== "string" || !valueToken) throw new CjError("CJ no devolvió un token válido");
  return { value: valueToken, expiresAt: Date.now() + Math.max(60, Number.isFinite(expiresIn) ? expiresIn : DEFAULT_TOKEN_TTL_MS / 1000) * 1000 - 30_000 };
}

async function request(url: string, init: RequestInit) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12_000);
  try { return await fetch(url, { ...init, signal: controller.signal, cache: "no-store" }); }
  catch { throw new CjError("No se pudo conectar con CJ"); }
  finally { clearTimeout(timer); }
}

export function clearCjTokenForTest() { tokenCache = undefined; tokenRequest = undefined; }

export async function getCjAccessToken() {
  if (tokenCache && tokenCache.expiresAt > Date.now()) return tokenCache.value;
  if (!process.env.CJ_API_KEY) throw new CjError("CJ no está configurado", 503);
  if (!tokenRequest) tokenRequest = (async () => {
    const response = await request(`${BASE_URL}/authentication/getAccessToken`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ apiKey: process.env.CJ_API_KEY }) });
    let body: unknown;
    try { body = await response.json(); } catch { throw new CjError("CJ devolvió una respuesta inválida"); }
    if (!response.ok) throw new CjError("CJ rechazó la autenticación", response.status);
    tokenCache = tokenFromResponse(body);
    return tokenCache.value;
  })().finally(() => { tokenRequest = undefined; });
  return tokenRequest;
}

export async function cjRequest(path: string) {
  const token = await getCjAccessToken();
  let response = await request(`${BASE_URL}${path}`, { headers: { "CJ-Access-Token": token, "Content-Type": "application/json" } });
  if (response.status === 401 || response.status === 403) {
    tokenCache = undefined;
    const refreshed = await getCjAccessToken();
    response = await request(`${BASE_URL}${path}`, { headers: { "CJ-Access-Token": refreshed, "Content-Type": "application/json" } });
  }
  let body: unknown;
  try { body = await response.json(); } catch { throw new CjError("CJ devolvió una respuesta inválida", response.status); }
  if (!response.ok) throw new CjError("CJ no pudo completar la consulta", response.status);
  return body;
}

export async function listCjProducts(page = 1, limit = 10) {
  const body = await cjRequest(`/product/list?pageNum=${page}&pageSize=${Math.min(Math.max(limit, 1), 10)}`);
  const record = asRecord(body); const data = asRecord(record?.data); const list = data?.list;
  if (!Array.isArray(list)) throw new CjError("CJ no devolvió una lista de productos");
  return list.filter((item): item is CjRecord => Boolean(asRecord(item)));
}

export async function getCjProductDetail(cjId: string) {
  if (!/^[a-zA-Z0-9_-]{1,160}$/.test(cjId)) throw new CjError("Identificador CJ inválido", 400);
  return cjRequest(`/product/query?pid=${encodeURIComponent(cjId)}`);
}

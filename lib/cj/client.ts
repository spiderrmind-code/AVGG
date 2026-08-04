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

export type CjRequestOptions = { path: string; method?: "GET" | "POST"; query?: Record<string, string | number | undefined>; body?: unknown };
export class CjFeatureDisabledError extends CjError { constructor() { super("La creación CJ está deshabilitada", 503); this.name = "CjFeatureDisabledError"; } }
export class CjContractError extends CjError { constructor(message = "Respuesta contractual CJ inválida") { super(message, 502); this.name = "CjContractError"; } }
export class CjValidationError extends CjError { constructor(message: string) { super(message, 400); this.name = "CjValidationError"; } }
export class CjUnknownResultError extends CjError { constructor() { super("CJ confirmó la solicitud sin identificador utilizable", 502); this.name = "CjUnknownResultError"; } }

export async function cjRequest<T = unknown>(input: string | CjRequestOptions): Promise<T> {
  const options = typeof input === "string" ? { path: input } : input;
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(options.query ?? {})) if (value !== undefined) search.set(key, String(value));
  const path = `${options.path}${search.size ? `${options.path.includes("?") ? "&" : "?"}${search}` : ""}`;
  const token = await getCjAccessToken();
  const init: RequestInit = { method: options.method ?? "GET", headers: { "CJ-Access-Token": token, "Content-Type": "application/json" }, ...(options.body === undefined ? {} : { body: JSON.stringify(options.body) }) };
  let response = await request(`${BASE_URL}${path}`, init);
  if (response.status === 401 || response.status === 403) {
    tokenCache = undefined;
    const refreshed = await getCjAccessToken();
    response = await request(`${BASE_URL}${path}`, { ...init, headers: { "CJ-Access-Token": refreshed, "Content-Type": "application/json" } });
  }
  let body: unknown;
  try { body = await response.json(); } catch { throw new CjError("CJ devolvió una respuesta inválida", response.status); }
  if (!response.ok) throw new CjError("CJ no pudo completar la consulta", response.status);
  return body as T;
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

type CjEnvelope = { code?: unknown; result?: unknown; success?: unknown; data?: unknown; message?: unknown };
function record(value: unknown): Record<string, unknown> | null { return value !== null && typeof value === "object" ? value as Record<string, unknown> : null; }
function text(value: unknown): string | undefined { return typeof value === "string" && value.trim() ? value.trim() : undefined; }
function number(value: unknown): number | undefined { const parsed = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN; return Number.isFinite(parsed) ? parsed : undefined; }
function data(value: unknown): unknown { const envelope = record(value) as CjEnvelope | null; if (!envelope || (envelope.result !== true && envelope.success !== true && envelope.code !== 200)) throw new CjContractError(); return envelope.data; }

export type CjStockResult = { status: "available" | "unavailable" | "unknown"; requestedQuantity: number; availableQuantity?: number; warehouse?: string; checkedAt: string; rawCode?: string | number };
export async function getCjVariantStock(input: { pid: string; variantId: string; sku: string; quantity: number }): Promise<CjStockResult> {
  if (!input.pid || !input.variantId || !input.sku || !Number.isInteger(input.quantity) || input.quantity < 1) throw new CjValidationError("Variante CJ inválida");
  const response = await cjRequest<unknown>({ path: "/product/stock/queryByVid", query: { vid: input.variantId } });
  const result = record(data(response)); const available = number(result?.totalInventoryNum ?? result?.totalStock ?? result?.stock ?? result?.inventory);
  const warehouse = text(result?.warehouseName ?? result?.warehouse);
  return { status: available === undefined ? "unknown" : available >= input.quantity ? "available" : "unavailable", requestedQuantity: input.quantity, ...(available === undefined ? {} : { availableQuantity: available }), ...(warehouse ? { warehouse } : {}), checkedAt: new Date().toISOString(), rawCode: (record(response)?.code as string | number | undefined) };
}

export type CjShippingOption = { logisticName: string; logisticId?: string; shippingCost: number; currency: string; estimatedDaysMin?: number; estimatedDaysMax?: number; warehouse?: string };
export async function quoteCjShipping(input: { variantId: string; quantity: number; countryCode: string; province: string; city: string; postalCode: string }): Promise<CjShippingOption[]> {
  if (!input.variantId || !Number.isInteger(input.quantity) || input.quantity < 1 || !/^[A-Z]{2}$/.test(input.countryCode)) throw new CjValidationError("Datos logísticos CJ inválidos");
  const response = await cjRequest<unknown>({ path: "/logistic/freightCalculate", method: "POST", body: { startCountryCode: "CN", endCountryCode: input.countryCode, products: [{ vid: input.variantId, quantity: input.quantity }], province: input.province, city: input.city, zip: input.postalCode } });
  const source = data(response); const sourceRecord = record(source); const options = Array.isArray(sourceRecord?.logisticInfoList) ? sourceRecord.logisticInfoList : Array.isArray(source) ? source : [];
  return options.flatMap((value): CjShippingOption[] => { const option = record(value); const logisticName = text(option?.logisticName); const shippingCost = number(option?.postage ?? option?.shippingCost); if (!logisticName || shippingCost === undefined || shippingCost < 0) return []; return [{ logisticName, ...(text(option?.id) ? { logisticId: text(option?.id) } : {}), shippingCost, currency: text(option?.currency) ?? "USD", ...(number(option?.deliveryDays) ? { estimatedDaysMax: number(option?.deliveryDays) } : {}) }]; });
}
export function selectCjShippingOption(options: CjShippingOption[]): CjShippingOption { const selected = [...options].sort((a, b) => a.shippingCost - b.shippingCost)[0]; if (!selected) throw new CjValidationError("CJ no devolvió logística válida"); return selected; }

export type CjCreatedOrder = { supplierOrderId: string; orderId?: string; orderNum?: string; cjOrderId?: string; shipmentOrderId?: string; status: string; createdAt: string };
export async function createCjOrder(input: { orderNumber: string; recipient: { firstName: string; lastName: string; email: string; phone: string; address: string; province: string; city: string; postalCode: string; countryCode: string }; logisticName: string; items: Array<{ variantId: string; sku: string; quantity: number }> }): Promise<CjCreatedOrder> {
  if (process.env.CJ_ORDER_CREATION_ENABLED !== "true") throw new CjFeatureDisabledError();
  const r = input.recipient; if (!input.orderNumber || !input.logisticName || !/^[A-Z]{2}$/.test(r.countryCode) || input.items.length === 0) throw new CjValidationError("Pedido CJ inválido");
  const response = await cjRequest<unknown>({ path: "/shopping/order/createOrderV3", method: "POST", body: { orderNumber: input.orderNumber, shippingZip: r.postalCode, shippingCountryCode: r.countryCode, shippingProvince: r.province, shippingCity: r.city, shippingPhone: r.phone, shippingCustomerName: `${r.firstName} ${r.lastName}`, shippingAddress: r.address, email: r.email, logisticName: input.logisticName, fromCountryCode: "CN", products: input.items.map((item) => ({ vid: item.variantId, sku: item.sku, quantity: item.quantity })) } });
  const result = record(data(response)); const orderId = text(result?.orderId); const orderNum = text(result?.orderNum); const cjOrderId = text(result?.cjOrderId); const shipmentOrderId = text(result?.shipmentOrderId); const supplierOrderId = cjOrderId ?? orderId ?? orderNum ?? shipmentOrderId; if (!supplierOrderId) throw new CjUnknownResultError(); return { supplierOrderId, ...(orderId ? { orderId } : {}), ...(orderNum ? { orderNum } : {}), ...(cjOrderId ? { cjOrderId } : {}), ...(shipmentOrderId ? { shipmentOrderId } : {}), status: text(result?.orderStatus) ?? "created", createdAt: new Date().toISOString() };
}

export type CjOrderDetail = { orderId?: string; orderNum?: string; cjOrderId?: string; shipmentOrderId?: string; status: string; trackingNumber?: string; logisticName?: string; createdAt?: string; updatedAt?: string };
function mapOrder(value: unknown): CjOrderDetail { const source = record(data(value)); if (!source) throw new CjContractError(); return { ...(text(source.orderId) ? { orderId: text(source.orderId) } : {}), ...(text(source.orderNum) ? { orderNum: text(source.orderNum) } : {}), ...(text(source.cjOrderId) ? { cjOrderId: text(source.cjOrderId) } : {}), ...(text(source.shipmentOrderId) ? { shipmentOrderId: text(source.shipmentOrderId) } : {}), status: text(source.orderStatus) ?? "unknown", ...(text(source.trackNumber) ? { trackingNumber: text(source.trackNumber) } : {}), ...(text(source.logisticName) ? { logisticName: text(source.logisticName) } : {}) }; }
export async function getCjOrderDetail(input: { orderId: string }): Promise<CjOrderDetail> { if (!input.orderId) throw new CjValidationError("orderId CJ requerido"); return mapOrder(await cjRequest({ path: "/shopping/order/getOrderDetail", query: { orderId: input.orderId } })); }
export async function listCjOrders(input: { orderIds?: string; shipmentOrderId?: string; page?: number; pageSize?: number }): Promise<CjOrderDetail[]> { const page = Math.max(1, input.page ?? 1); const pageSize = Math.min(20, Math.max(1, input.pageSize ?? 10)); const response = await cjRequest<unknown>({ path: "/shopping/order/list", query: { pageNum: page, pageSize, orderIds: input.orderIds, shipmentOrderId: input.shipmentOrderId } }); const source = record(data(response)); const list = Array.isArray(source?.list) ? source.list : []; return list.map((item) => mapOrder({ success: true, data: item })); }
export type CjTrackingResult = { status: "pending" | "shipped" | "in_transit" | "delivered" | "exception" | "unknown"; trackingNumber?: string; carrier?: string; trackingUrl?: string; lastUpdatedAt?: string; events: Array<{ status: string; description?: string; occurredAt?: string; location?: string }> };
export async function getCjTracking(input: { trackingNumber: string }): Promise<CjTrackingResult> { if (!input.trackingNumber) throw new CjValidationError("Tracking CJ requerido"); const response = await cjRequest<unknown>({ path: "/logistic/trackInfo", query: { trackNumber: input.trackingNumber } }); const source = data(response); const row = Array.isArray(source) ? record(source[0]) : null; if (!row) return { status: "pending", events: [] }; const raw = (text(row.trackingStatus) ?? "unknown").toLowerCase(); const status: CjTrackingResult["status"] = raw.includes("deliver") ? "delivered" : raw.includes("transit") ? "in_transit" : raw.includes("ship") ? "shipped" : raw.includes("exception") ? "exception" : "unknown"; return { status, ...(text(row.trackingNumber) ? { trackingNumber: text(row.trackingNumber) } : {}), ...(text(row.lastMileCarrier) ? { carrier: text(row.lastMileCarrier) } : {}), ...(text(row.deliveryTime) ? { lastUpdatedAt: text(row.deliveryTime) } : {}), events: [] }; }
export async function reconcileCjOrder(input: { orderId?: string; shipmentOrderId?: string }): Promise<CjOrderDetail | null> {
  if (input.orderId) return getCjOrderDetail({ orderId: input.orderId });
  if (!input.shipmentOrderId) throw new CjValidationError("Identificador CJ requerido para reconciliar");
  return (await listCjOrders({ shipmentOrderId: input.shipmentOrderId, page: 1, pageSize: 1 }))[0] ?? null;
}

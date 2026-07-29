type MercadoPagoPreferenceResponse = Record<string, unknown>;
type MercadoPagoMode = "sandbox" | "production";
type MercadoPagoEnvironment = { MERCADOPAGO_MODE?: string; MERCADOPAGO_ACCESS_TOKEN?: string };
function runtimeEnvironment(): MercadoPagoEnvironment {
  return { MERCADOPAGO_MODE: process.env.MERCADOPAGO_MODE, MERCADOPAGO_ACCESS_TOKEN: process.env.MERCADOPAGO_ACCESS_TOKEN };
}

export function requireMercadoPagoMode(environment: MercadoPagoEnvironment = runtimeEnvironment()): MercadoPagoMode {
  const mode = environment.MERCADOPAGO_MODE?.trim().toLowerCase();
  if (mode === "sandbox" || mode === "production") return mode;
  throw new Error("Mercado Pago mode must be explicitly set to sandbox or production");
}

export function isMercadoPagoSandbox(environment: MercadoPagoEnvironment = runtimeEnvironment()) {
  return requireMercadoPagoMode(environment) === "sandbox";
}

export function requireMercadoPagoAccessToken(environment: MercadoPagoEnvironment = runtimeEnvironment()) {
  const accessToken = environment.MERCADOPAGO_ACCESS_TOKEN?.trim();
  if (!accessToken) throw new Error("Mercado Pago access token is not configured");
  return accessToken;
}

export function selectMercadoPagoCheckoutUrl(response: MercadoPagoPreferenceResponse, sandbox: boolean) {
  const sandboxInitPoint = typeof response.sandbox_init_point === "string" ? response.sandbox_init_point : null;
  const initPoint = typeof response.init_point === "string" ? response.init_point : null;
  return sandbox ? sandboxInitPoint ?? initPoint : initPoint;
}

function safeProviderText(value: unknown) {
  return typeof value === "string" ? value.replace(/[\r\n]/g, " ").slice(0, 240) : undefined;
}

export function sanitizeMercadoPagoPreferenceError(value: unknown) {
  const data = value && typeof value === "object" ? value as Record<string, unknown> : {};
  const firstCause = Array.isArray(data.cause) && data.cause[0] && typeof data.cause[0] === "object" ? data.cause[0] as Record<string, unknown> : {};
  return {
    ...(safeProviderText(data.error) ? { providerCode: safeProviderText(data.error) } : {}),
    ...(safeProviderText(data.message) ? { providerMessage: safeProviderText(data.message) } : {}),
    ...(safeProviderText(firstCause.code) ? { providerCause: safeProviderText(firstCause.code) } : {}),
    ...(safeProviderText(firstCause.description) ? { providerField: safeProviderText(firstCause.description) } : {}),
  };
}

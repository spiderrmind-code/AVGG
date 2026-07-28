function normalizeAppUrl(candidate: string, source: string): string {
  const value = candidate.trim();
  const withProtocol = source === "VERCEL_URL" && !/^https?:\/\//i.test(value) ? `https://${value}` : value;
  const url = new URL(withProtocol);

  if (url.username || url.password || url.pathname !== "/" || url.search || url.hash) {
    throw new Error(`${source} debe ser una URL base sin ruta, credenciales, query ni hash`);
  }
  if (process.env.NODE_ENV === "production" && (url.protocol !== "https:" || url.hostname === "localhost" || url.hostname === "127.0.0.1")) {
    throw new Error(`${source} debe usar HTTPS y no puede apuntar a localhost en producción`);
  }

  return url.origin;
}

export function resolveAppBaseUrl(): string {
  const candidates: Array<[string, string | undefined]> = [
    ["NEXT_PUBLIC_APP_URL", process.env.NEXT_PUBLIC_APP_URL],
    ["NEXTAUTH_URL", process.env.NEXTAUTH_URL],
    ["VERCEL_URL", process.env.VERCEL_URL],
  ];

  for (const [source, value] of candidates) {
    if (value?.trim()) return normalizeAppUrl(value, source);
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error("Falta una URL pública de aplicación para producción");
  }

  return "http://localhost:3000";
}

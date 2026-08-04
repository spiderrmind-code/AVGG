function originFrom(value: string | undefined): string | null {
  if (!value?.trim()) return null;
  try { return new URL(value).origin; } catch { return null; }
}

export function allowedRequestOrigins(): Set<string> {
  const origins = new Set<string>();
  for (const value of [process.env.NEXT_PUBLIC_SITE_URL, process.env.NEXT_PUBLIC_APP_URL, process.env.NEXTAUTH_URL]) {
    const origin = originFrom(value);
    if (origin) origins.add(origin);
  }
  if (process.env.NODE_ENV !== "production") {
    origins.add("http://localhost:3000");
    origins.add("http://127.0.0.1:3000");
  }
  return origins;
}

export function hasTrustedOrigin(request: Request, allowMissing = false): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return allowMissing;
  const normalized = originFrom(origin);
  return normalized !== null && allowedRequestOrigins().has(normalized);
}

export function hasJsonContentType(request: Request): boolean {
  return request.headers.get("content-type")?.toLowerCase().startsWith("application/json") ?? false;
}

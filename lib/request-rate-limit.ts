type RateLimitEntry = { count: number; resetAt: number };

const entries = new Map<string, RateLimitEntry>();

export type RateLimitResult = { allowed: boolean; retryAfter: number };

export function checkRateLimit(identifier: string, limit = 10, windowMs = 10 * 60 * 1000): RateLimitResult {
  const now = Date.now();
  const current = entries.get(identifier);
  if (!current || current.resetAt <= now) {
    entries.set(identifier, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfter: Math.ceil(windowMs / 1000) };
  }
  if (current.count >= limit) return { allowed: false, retryAfter: Math.max(1, Math.ceil((current.resetAt - now) / 1000)) };
  current.count += 1;
  return { allowed: true, retryAfter: Math.max(1, Math.ceil((current.resetAt - now) / 1000)) };
}

export function allowRequest(identifier: string, limit = 10, windowMs = 10 * 60 * 1000): boolean { return checkRateLimit(identifier, limit, windowMs).allowed; }

export function requestIdentifier(request: Request): string {
  const direct = request.headers.get("x-vercel-forwarded-for") || request.headers.get("x-real-ip");
  const forwarded = request.headers.get("x-forwarded-for")?.split(",").map((value) => value.trim()).filter(Boolean).pop();
  const candidate = direct || forwarded || "unknown";
  return /^[0-9a-fA-F:.]{3,64}$/.test(candidate) ? candidate.toLowerCase() : "unknown";
}

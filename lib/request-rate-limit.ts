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

type RedisPipelineReply = Array<{ result?: unknown }>;

function distributedRateLimitConfig() {
  const url = process.env.RATE_LIMIT_REDIS_URL?.trim();
  const token = process.env.RATE_LIMIT_REDIS_TOKEN?.trim();
  return url?.startsWith("https://") && token ? { url: url.replace(/\/$/, ""), token } : null;
}

/** Uses an optional Redis REST endpoint in serverless environments and falls back locally on configuration or network failure. */
export async function checkRateLimitDistributed(identifier: string, limit = 10, windowMs = 10 * 60 * 1000): Promise<RateLimitResult> {
  const config = distributedRateLimitConfig();
  if (!config) return checkRateLimit(identifier, limit, windowMs);
  const key = `avg:rate:${identifier}`;
  const seconds = Math.max(1, Math.ceil(windowMs / 1000));
  try {
    const response = await fetch(`${config.url}/pipeline`, {
      method: "POST",
      headers: { Authorization: `Bearer ${config.token}`, "Content-Type": "application/json" },
      body: JSON.stringify([["INCR", key], ["EXPIRE", key, seconds, "NX"], ["TTL", key]]),
    });
    const reply: unknown = await response.json();
    if (!response.ok || !Array.isArray(reply)) return checkRateLimit(identifier, limit, windowMs);
    const pipeline = reply as RedisPipelineReply;
    const count = typeof pipeline[0]?.result === "number" ? pipeline[0].result : NaN;
    const ttl = typeof pipeline[2]?.result === "number" ? pipeline[2].result : seconds;
    if (!Number.isFinite(count)) return checkRateLimit(identifier, limit, windowMs);
    return { allowed: count <= limit, retryAfter: Math.max(1, ttl) };
  } catch {
    return checkRateLimit(identifier, limit, windowMs);
  }
}

export function requestIdentifier(request: Request): string {
  const direct = request.headers.get("x-vercel-forwarded-for") || request.headers.get("x-real-ip");
  const forwarded = request.headers.get("x-forwarded-for")?.split(",").map((value) => value.trim()).filter(Boolean).pop();
  const candidate = direct || forwarded || "unknown";
  return /^[0-9a-fA-F:.]{3,64}$/.test(candidate) ? candidate.toLowerCase() : "unknown";
}

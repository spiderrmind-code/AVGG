export function isAuthorizedCronRequest(request: Request) {
  const expected = process.env.VERCEL_CRON_SECRET?.trim() || process.env.CRON_SECRET?.trim();
  if (!expected) return false;
  const authorization = request.headers.get("authorization") ?? "";
  if (authorization.startsWith("Bearer ")) return authorization.slice(7).trim() === expected;
  return request.headers.get("x-vercel-cron") === "1" && request.headers.get("x-cron-secret") === expected;
}

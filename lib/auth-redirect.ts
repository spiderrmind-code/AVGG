export function resolveSafeAuthRedirect(url: string, baseUrl: string): string {
  if (url.startsWith("/")) return `${baseUrl}${url}`;
  try { return new URL(url).origin === baseUrl ? url : baseUrl; } catch { return baseUrl; }
}

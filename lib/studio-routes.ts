const publicStudioRoutes = new Set([
  "/",
  "/turnos",
  "/contacto",
  "/admin",
  "/admin/turnos",
  "/login",
  "/api/appointments",
  "/api/admin/appointments",
  "/api/health",
  "/api/readiness",
  "/robots.txt",
  "/sitemap.xml",
  "/manifest.webmanifest",
  "/icon.svg",
  "/favicon.ico",
]);

export function isStudioRouteAllowed(pathname: string) {
  return publicStudioRoutes.has(pathname)
    || pathname.startsWith("/api/auth/")
    || pathname.startsWith("/_next/")
    || pathname.startsWith("/image/");
}
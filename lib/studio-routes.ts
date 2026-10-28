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

const studioBuildFlag = process.env.NEXT_PUBLIC_STUDIO_DEPLOYMENT === "true";

export function isStudioDeployment(environment: Record<string, string | undefined> = process.env) {
  return studioBuildFlag || environment.STUDIO_DEPLOYMENT === "true" || environment.NEXT_PUBLIC_STUDIO_DEPLOYMENT === "true";
}

export function isStudioRouteAllowed(pathname: string) {
  return publicStudioRoutes.has(pathname)
    || pathname.startsWith("/api/auth/")
    || pathname.startsWith("/_next/")
    || pathname.startsWith("/image/");
}
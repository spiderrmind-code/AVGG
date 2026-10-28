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

function isTrue(value: string | undefined) {
  return value?.trim().replace(/\\[rn]+$/i, "").trim() === "true";
}

const studioBuildFlag = isTrue(process.env.NEXT_PUBLIC_STUDIO_DEPLOYMENT);

export function isStudioDeployment(environment: Record<string, string | undefined> = process.env) {
  return studioBuildFlag || isTrue(environment.STUDIO_DEPLOYMENT) || isTrue(environment.NEXT_PUBLIC_STUDIO_DEPLOYMENT);
}

export function isStudioRouteAllowed(pathname: string) {
  return publicStudioRoutes.has(pathname)
    || pathname.startsWith("/api/auth/")
    || pathname.startsWith("/_next/")
    || pathname.startsWith("/image/");
}
import { normalizeEmail } from "@/lib/auth-validation";

type StudioDeploymentEnvironment = Record<string, string | undefined>;

type DeploymentFlag = true | false | "invalid" | undefined;

const publicStudioRoutes = new Set([
  "/",
  "/turnos",
  "/contacto",
  "/politica-de-privacidad",
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

function parseDeploymentFlag(value: string | undefined): DeploymentFlag {
  const normalized = value?.trim().replace(/\\[rn]+$/i, "").trim().toLowerCase();
  if (!normalized) return undefined;
  if (normalized === "true") return true;
  if (normalized === "false") return false;
  return "invalid";
}

export function resolveStudioDeployment(environment: StudioDeploymentEnvironment = process.env) {
  const serverFlag = parseDeploymentFlag(environment.STUDIO_DEPLOYMENT);
  const publicFlag = parseDeploymentFlag(environment.NEXT_PUBLIC_STUDIO_DEPLOYMENT);
  const enabled = serverFlag === true || publicFlag === true || serverFlag === "invalid" || publicFlag === "invalid";
  const validFlags = serverFlag !== "invalid" && publicFlag !== "invalid";
  const consistent = validFlags && (enabled
    ? serverFlag === true && publicFlag === true
    : true);

  return { enabled, consistent };
}

export function isStudioDeployment(environment: StudioDeploymentEnvironment = process.env) {
  return resolveStudioDeployment(environment).enabled;
}

export function isAuthorizedStudioAdmin(
  email: string | null | undefined,
  role: string | null | undefined,
  environment: StudioDeploymentEnvironment = process.env,
) {
  const deployment = resolveStudioDeployment(environment);
  const configuredEmail = environment.STUDIO_ADMIN_EMAIL;
  return deployment.enabled
    && deployment.consistent
    && role?.toLowerCase() === "admin"
    && Boolean(configuredEmail?.trim())
    && typeof email === "string"
    && normalizeEmail(email) === normalizeEmail(configuredEmail ?? "");
}

export function isStudioRouteAllowed(pathname: string) {
  return publicStudioRoutes.has(pathname)
    || pathname.startsWith("/api/auth/")
    || pathname.startsWith("/_next/")
    || pathname.startsWith("/image/");
}

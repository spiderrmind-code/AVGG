import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { checkRateLimitDistributed, checkStudioRateLimit, requestIdentifier } from "@/lib/request-rate-limit";
import { hasJsonContentType, hasTrustedOrigin } from "@/lib/request-security";
import { resolveAuthSecret } from "@/lib/auth-secret";
import { isStudioRouteAllowed, resolveStudioDeployment } from "@/lib/studio-routes";

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const deployment = resolveStudioDeployment();
  const studioDeployment = deployment.enabled;
  if (studioDeployment && !isStudioRouteAllowed(pathname)) {
    return new NextResponse(null, { status: 404 });
  }
  if (studioDeployment && pathname === "/admin") {
    return NextResponse.redirect(new URL("/admin/turnos", req.url));
  }

  const authSecret = resolveAuthSecret();
  const isSensitiveApi = pathname.startsWith("/api/admin/") || pathname === "/api/suppliers";
  const isAdminPage = pathname.startsWith("/admin");
  if (studioDeployment && (isSensitiveApi || isAdminPage) && (!deployment.consistent || !authSecret)) {
    return NextResponse.json({ success: false, message: "La administración no está configurada." }, { status: 503 });
  }
  const isMutation = ["POST", "PUT", "PATCH", "DELETE"].includes(req.method);

  if (isSensitiveApi) {
    const token = await getToken({ req, secret: authSecret });
    if (!token) return NextResponse.json({ success: false, message: "No autenticado" }, { status: 401 });
    if (String(token.role || "").toLowerCase() !== "admin") return NextResponse.json({ success: false, message: "No autorizado" }, { status: 403 });
    const rateLimitKey = `sensitive:${pathname}:${String(token.id ?? token.email ?? "admin")}:${requestIdentifier(req)}`;
    const limit = studioDeployment
      ? await checkStudioRateLimit(rateLimitKey, pathname.startsWith("/api/admin/") ? 60 : 30, 10 * 60 * 1000)
      : await checkRateLimitDistributed(rateLimitKey, pathname.startsWith("/api/admin/") ? 60 : 30, 10 * 60 * 1000);
    if (!limit.allowed) return NextResponse.json({ success: false, message: "Demasiadas solicitudes" }, { status: 429, headers: { "Retry-After": String(limit.retryAfter) } });
    if (isMutation && !hasTrustedOrigin(req)) return NextResponse.json({ success: false, message: "Origen no permitido" }, { status: 403 });
    if (isMutation && !hasJsonContentType(req)) return NextResponse.json({ success: false, message: "Content-Type inválido" }, { status: 415 });
  }

  if (!pathname.startsWith("/admin")) {
    return NextResponse.next();
  }

  const token = await getToken({ req, secret: authSecret });

  if (!token || String(token.role || "").toLowerCase() !== "admin") {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", req.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};

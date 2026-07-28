import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { checkRateLimit, requestIdentifier } from "@/lib/request-rate-limit";
import { hasJsonContentType, hasTrustedOrigin } from "@/lib/request-security";

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isSensitiveApi = pathname.startsWith("/api/admin/") || pathname.startsWith("/api/cj/") || pathname === "/api/suppliers";
  const isMutation = ["POST", "PUT", "PATCH", "DELETE"].includes(req.method);

  if (isSensitiveApi) {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token) return NextResponse.json({ success: false, message: "No autenticado" }, { status: 401 });
    if (String(token.role || "").toLowerCase() !== "admin") return NextResponse.json({ success: false, message: "No autorizado" }, { status: 403 });
    const limit = checkRateLimit(`sensitive:${pathname}:${String(token.id ?? token.email ?? "admin")}:${requestIdentifier(req)}`, pathname.startsWith("/api/admin/") ? 60 : 30, 10 * 60 * 1000);
    if (!limit.allowed) return NextResponse.json({ success: false, message: "Demasiadas solicitudes" }, { status: 429, headers: { "Retry-After": String(limit.retryAfter) } });
    if (isMutation && !hasTrustedOrigin(req)) return NextResponse.json({ success: false, message: "Origen no permitido" }, { status: 403 });
    if (isMutation && !hasJsonContentType(req)) return NextResponse.json({ success: false, message: "Content-Type inválido" }, { status: 415 });
  }

  if (!pathname.startsWith("/admin")) {
    return NextResponse.next();
  }

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

  if (!token || String(token.role || "").toLowerCase() !== "admin") {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", req.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*", "/api/cj/:path*", "/api/suppliers"],
};

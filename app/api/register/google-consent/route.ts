import { NextResponse } from "next/server";
import { checkAppointmentRateLimit } from "@/lib/appointments";
import { requireAuthSecret } from "@/lib/auth-secret";
import { logServerError } from "@/lib/logger";
import { getStudioDb } from "@/lib/studio-mongo";
import { requestIdentifier } from "@/lib/request-rate-limit";
import { hasJsonContentType, hasTrustedOrigin } from "@/lib/request-security";
import { isStudioAccountRegistrationEnabled, isStudioDeployment } from "@/lib/studio-routes";
import {
  createStudioGoogleSignupConsentToken,
  studioGoogleSignupConsentCookie,
  studioGoogleSignupConsentMaxAgeSeconds,
} from "@/lib/studio-google-signup-consent";

export async function POST(request: Request) {
  if (!isStudioDeployment()) return NextResponse.json({ message: "No encontrado." }, { status: 404 });
  if (!isStudioAccountRegistrationEnabled()) {
    return NextResponse.json({ message: "El registro de cuentas está pausado mientras se finalizan las verificaciones de privacidad." }, { status: 503 });
  }
  if (!hasTrustedOrigin(request)) return NextResponse.json({ message: "Origen no permitido." }, { status: 403 });
  if (!hasJsonContentType(request)) return NextResponse.json({ message: "Content-Type inválido." }, { status: 415 });

  try {
    const rawBody = await request.text();
    if (rawBody.length > 1_000) return NextResponse.json({ message: "La solicitud supera el tamaño permitido." }, { status: 413 });

    let body: { privacyConsent?: unknown };
    try {
      body = JSON.parse(rawBody) as { privacyConsent?: unknown };
    } catch {
      return NextResponse.json({ message: "El formato de la solicitud no es válido." }, { status: 400 });
    }
    if (body.privacyConsent !== true) {
      return NextResponse.json({ message: "Debés aceptar la política de privacidad." }, { status: 400 });
    }

    const secret = requireAuthSecret();
    const db = await getStudioDb();
    const limit = await checkAppointmentRateLimit(
      db,
      `google-signup-consent:${requestIdentifier(request)}`,
      secret,
      5,
      15 * 60 * 1_000,
    );
    if (!limit.allowed) {
      return NextResponse.json(
        { message: "Demasiados intentos. Intentá nuevamente más tarde." },
        { status: 429, headers: { "Retry-After": String(limit.retryAfter), "Cache-Control": "no-store" } },
      );
    }

    const response = NextResponse.json({ success: true }, { headers: { "Cache-Control": "no-store" } });
    response.cookies.set(studioGoogleSignupConsentCookie, createStudioGoogleSignupConsentToken(secret), {
      httpOnly: true,
      maxAge: studioGoogleSignupConsentMaxAgeSeconds,
      path: "/",
      sameSite: "lax",
      secure: new URL(request.url).protocol === "https:",
    });
    return response;
  } catch (error) {
    logServerError("studio_google_signup_consent_failed", { errorType: error instanceof Error ? error.name : "unknown" });
    return NextResponse.json({ message: "No se pudo iniciar el registro con Google." }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}

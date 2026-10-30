import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { requireAuthSecret } from "@/lib/auth-secret";
import { studioPrivacyNoticeVersion } from "@/lib/appointments";

export const studioGoogleSignupConsentCookie = "studio_google_signup_consent";
export const studioGoogleSignupConsentMaxAgeSeconds = 10 * 60;

type ConsentPayload = {
  issuedAt: number;
  nonce: string;
  privacyNoticeVersion: string;
};

export function createStudioGoogleSignupConsentToken(secret: string, now = Date.now()) {
  const payload: ConsentPayload = {
    issuedAt: now,
    nonce: randomBytes(16).toString("base64url"),
    privacyNoticeVersion: studioPrivacyNoticeVersion,
  };
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = createHmac("sha256", secret).update(encodedPayload).digest("base64url");
  return `${encodedPayload}.${signature}`;
}

export function verifyStudioGoogleSignupConsentToken(token: string, secret: string, now = Date.now()) {
  if (token.length > 1_024) return false;
  const [encodedPayload, encodedSignature, ...extraParts] = token.split(".");
  if (!encodedPayload || !encodedSignature || extraParts.length) return false;

  const expectedSignature = createHmac("sha256", secret).update(encodedPayload).digest();
  const actualSignature = Buffer.from(encodedSignature, "base64url");
  if (actualSignature.length !== expectedSignature.length || !timingSafeEqual(actualSignature, expectedSignature)) return false;

  let payload: ConsentPayload;
  try {
    payload = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8")) as ConsentPayload;
  } catch {
    return false;
  }
  return Number.isSafeInteger(payload.issuedAt)
    && payload.issuedAt <= now
    && now - payload.issuedAt <= studioGoogleSignupConsentMaxAgeSeconds * 1_000
    && /^[A-Za-z0-9_-]{22}$/.test(payload.nonce)
    && payload.privacyNoticeVersion === studioPrivacyNoticeVersion;
}

export async function consumeStudioGoogleSignupConsent() {
  const cookieStore = await cookies();
  const token = cookieStore.get(studioGoogleSignupConsentCookie)?.value;
  cookieStore.delete(studioGoogleSignupConsentCookie);
  return token ? verifyStudioGoogleSignupConsentToken(token, requireAuthSecret()) : false;
}

import assert from "node:assert/strict";
import { createStudioGoogleSignupConsentToken, verifyStudioGoogleSignupConsentToken } from "@/lib/studio-google-signup-consent";
import test from "node:test";

test("Google signup consent is signed, short-lived, and tied to the current privacy notice", () => {
  const secret = "studio-test-secret";
  const now = Date.parse("2026-10-30T00:00:00.000Z");
  const token = createStudioGoogleSignupConsentToken(secret, now);

  assert.equal(verifyStudioGoogleSignupConsentToken(token, secret, now), true);
  assert.equal(verifyStudioGoogleSignupConsentToken(token, "different-secret", now), false);
  assert.equal(verifyStudioGoogleSignupConsentToken(`${token}x`, secret, now), false);
  assert.equal(verifyStudioGoogleSignupConsentToken(token, secret, now + 10 * 60 * 1_000 + 1), false);
  assert.equal(verifyStudioGoogleSignupConsentToken(token, secret, now - 1), false);
});

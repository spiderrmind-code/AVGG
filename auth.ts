import type { AuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { getStudioDb } from "@/lib/studio-mongo";
import { isValidEmail, normalizeEmail, normalizeRole } from "@/lib/auth-validation";
import { getGoogleAuthConfig } from "@/lib/auth-config";
import { resolveSafeAuthRedirect } from "@/lib/auth-redirect";
import { resolveAuthSecret } from "@/lib/auth-secret";
import { checkAppointmentRateLimit, isDuplicateKeyError, studioPrivacyNoticeVersion } from "@/lib/appointments";
import { consumeStudioGoogleSignupConsent } from "@/lib/studio-google-signup-consent";
import { isAuthorizedStudioAdmin, isStudioAccountRegistrationEnabled, isStudioDeployment } from "@/lib/studio-routes";

const configuredSecret = resolveAuthSecret();
if (!configuredSecret && process.env.NODE_ENV === "production") throw new Error("Missing authentication secret");
const authSecret = configuredSecret ?? "local-development-secret";
const studioDeployment = isStudioDeployment();
const google = getGoogleAuthConfig(process.env, studioDeployment);
const configuredAdminEmail = studioDeployment
  ? process.env.STUDIO_ADMIN_EMAIL
  : process.env.ADMIN_EMAIL;
const adminEmail = configuredAdminEmail ? normalizeEmail(configuredAdminEmail) : "";

async function getAuthDb() {
  if (studioDeployment) return getStudioDb();
  const { getDb } = await import("@/lib/mongo");
  return getDb();
}

function roleForEmail(email: string | null | undefined, storedRole?: string) {
  if (studioDeployment) {
    return normalizeRole(storedRole) === "admin" && isAuthorizedStudioAdmin(email, storedRole) ? "admin" : "customer";
  }
  return adminEmail && email && normalizeEmail(email) === adminEmail ? "admin" : normalizeRole(storedRole);
}

function hasVerifiedGoogleEmail(profile: unknown): boolean {
  return typeof profile === "object"
    && profile !== null
    && "email_verified" in profile
    && profile.email_verified === true;
}

export const authOptions: AuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: { email: { label: "Email", type: "email" }, password: { label: "Contraseña", type: "password" } },
      async authorize(credentials) {
        const emailValue = typeof credentials?.email === "string" ? credentials.email : "";
        const password = typeof credentials?.password === "string" ? credentials.password : "";
        if (!emailValue || !password) return null;
        const email = normalizeEmail(emailValue);
        const db = await getAuthDb();
        const limit = studioDeployment
          ? await checkAppointmentRateLimit(db, `login:${email}`, configuredSecret ?? "local-development-secret", 10, 15 * 60 * 1000)
          : { allowed: true, retryAfter: 0 };
        if (!limit.allowed) return null;
        const user = await db.collection("users").findOne({ email });
        if (!user || (typeof user.status === "string" && user.status !== "active") || typeof user.password !== "string" || !(await bcrypt.compare(password, user.password))) return null;
        return { id: String(user._id), email, name: typeof user.name === "string" ? user.name : "", role: roleForEmail(email, typeof user.role === "string" ? user.role : undefined) };
      },
    }),
    ...(google.googleEnabled ? [GoogleProvider({ clientId: google.googleClientId!, clientSecret: google.googleClientSecret! })] : []),
  ],
  session: { strategy: "jwt" },
  useSecureCookies: process.env.NODE_ENV === "production",
  pages: { signIn: "/login" },
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider !== "google") return true;
      if (!user.email) return false;
      const email = normalizeEmail(user.email);
      if (!isValidEmail(email)) return false;
      const db = await getAuthDb();
      const users = db.collection("users");
      const existing = await users.findOne({ email });
      if (studioDeployment) {
        if (!hasVerifiedGoogleEmail(profile)
          || isAuthorizedStudioAdmin(email, "admin")) return false;
        const accountRegistrationEnabled = isStudioAccountRegistrationEnabled();
        if (existing?.privacyAcceptedAt && (existing.status === undefined || existing.status === "active") && !accountRegistrationEnabled) {
          user.id = String(existing._id);
          user.role = "customer";
          return true;
        }
        if (!accountRegistrationEnabled) return false;
        const signupConsent = await consumeStudioGoogleSignupConsent();
        const now = new Date();
        if (existing?.privacyAcceptedAt && (existing.status === undefined || existing.status === "active")) {
          await users.updateOne(
            { _id: existing._id },
            { $set: { email, name: user.name ?? existing.name ?? "", image: user.image ?? null, role: "customer", updatedAt: now, lastLoginAt: now } },
          );
          user.id = String(existing._id);
        } else {
          if (existing || !signupConsent) return false;
          try {
            const result = await users.insertOne({
              email,
              name: user.name ?? "",
              image: user.image ?? null,
              phone: "",
              password: null,
              role: "customer",
              status: "active",
              provider: "google",
              emailVerified: true,
              privacyAcceptedAt: now,
              privacyNoticeVersion: studioPrivacyNoticeVersion,
              createdAt: now,
              updatedAt: now,
              lastLoginAt: now,
            });
            user.id = String(result.insertedId);
          } catch (error) {
            if (!isDuplicateKeyError(error)) throw error;
            const racedUser = await users.findOne({ email });
            if (!racedUser?.privacyAcceptedAt || (racedUser.status !== undefined && racedUser.status !== "active")) return false;
            await users.updateOne(
              { _id: racedUser._id },
              { $set: { email, name: user.name ?? racedUser.name ?? "", image: user.image ?? null, role: "customer", updatedAt: now, lastLoginAt: now } },
            );
            user.id = String(racedUser._id);
          }
        }
        user.role = "customer";
        await db.collection("appointments").updateMany(
          { email, userId: { $exists: false } },
          { $set: { userId: user.id, updatedAt: now } },
        );
        return true;
      }
      const role = roleForEmail(email, typeof existing?.role === "string" ? existing.role : undefined);
      if (!existing) await users.insertOne({ email, name: user.name ?? "", image: user.image ?? null, password: null, role, provider: "google", createdAt: new Date(), updatedAt: new Date() });
      else if (existing.role !== role) await users.updateOne({ _id: existing._id }, { $set: { role, updatedAt: new Date() } });
      return true;
    },
    async jwt({ token, user }) {
      if (user) { token.id = user.id; token.role = studioDeployment ? roleForEmail(user.email, user.role) : roleForEmail(user.email, user.role); }
      else if (!studioDeployment && typeof token.email === "string" && adminEmail && normalizeEmail(token.email) === adminEmail) token.role = "admin";
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.id) session.user = { ...session.user, id: token.id, role: normalizeRole(token.role) };
      return session;
    },
    async redirect({ url, baseUrl }) { return resolveSafeAuthRedirect(url, baseUrl); },
  },
  secret: authSecret,
};

import type { AuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { getDb } from "@/lib/mongo";
import { normalizeEmail, normalizeRole } from "@/lib/auth-validation";
import { getGoogleAuthConfig } from "@/lib/auth-config";

const configuredSecret = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;
if (!configuredSecret && process.env.NODE_ENV === "production") throw new Error("Missing authentication secret");
const authSecret = configuredSecret ?? "local-development-secret";
const google = getGoogleAuthConfig();
const adminEmail = process.env.ADMIN_EMAIL ? normalizeEmail(process.env.ADMIN_EMAIL) : "";

function roleForEmail(email: string | null | undefined, storedRole?: string) {
  return adminEmail && email && normalizeEmail(email) === adminEmail ? "admin" : normalizeRole(storedRole);
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
        const user = await (await getDb()).collection("users").findOne({ email });
        if (!user || typeof user.password !== "string" || !(await bcrypt.compare(password, user.password))) return null;
        return { id: String(user._id), email, name: typeof user.name === "string" ? user.name : "", role: roleForEmail(email, typeof user.role === "string" ? user.role : undefined) };
      },
    }),
    ...(google.googleEnabled ? [GoogleProvider({ clientId: google.googleClientId!, clientSecret: google.googleClientSecret! })] : []),
  ],
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider !== "google" || !user.email) return true;
      const email = normalizeEmail(user.email);
      const users = (await getDb()).collection("users");
      const existing = await users.findOne({ email });
      const role = roleForEmail(email, typeof existing?.role === "string" ? existing.role : undefined);
      if (!existing) await users.insertOne({ email, name: user.name ?? "", image: user.image ?? null, password: null, role, provider: "google", createdAt: new Date(), updatedAt: new Date() });
      else if (existing.role !== role) await users.updateOne({ _id: existing._id }, { $set: { role, updatedAt: new Date() } });
      return true;
    },
    async jwt({ token, user }) {
      if (user) { token.id = user.id; token.role = roleForEmail(user.email, user.role); }
      else if (typeof token.email === "string" && adminEmail && normalizeEmail(token.email) === adminEmail) token.role = "admin";
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.id) session.user = { ...session.user, id: token.id, role: normalizeRole(token.role) };
      return session;
    },
    async redirect({ url, baseUrl }) {
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      try { return new URL(url).origin === baseUrl ? url : baseUrl; } catch { return baseUrl; }
    },
  },
  secret: authSecret,
};

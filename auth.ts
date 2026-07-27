import type { AuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { getDb } from "@/lib/mongo";
import type { UserRole } from "@/models/User";
import { normalizeEmail, normalizeRole } from "@/lib/auth-validation";
import { getGoogleAuthConfig } from "@/lib/auth-config";

const authSecret = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET ?? "avg-connects-dev-secret";

const providers: any[] = [
  CredentialsProvider({
    name: "Credentials",
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Contraseña", type: "password" },
    },
    async authorize(credentials) {
      if (!credentials?.email || !credentials?.password) {
        throw new Error("Email y contraseña son obligatorios");
      }

      const db = await getDb();
      const email = normalizeEmail(String(credentials.email));
      const user = await db.collection("users").findOne({ email });

      if (!user) {
        throw new Error("Usuario no encontrado");
      }

      const isValid = await bcrypt.compare(credentials.password, user.password);
      if (!isValid) {
        throw new Error("Contraseña incorrecta");
      }

      await db.collection("users").updateOne(
        { _id: user._id },
        { $set: { lastLoginAt: new Date(), updatedAt: new Date() } }
      );

      return {
        id: user._id.toString(),
        email: user.email,
        name: user.name ?? "",
        role: normalizeRole(user.role) as UserRole,
      };
    },
  }),
];

const { googleEnabled, googleClientId, googleClientSecret } = getGoogleAuthConfig();

if (googleEnabled) {
  providers.unshift(
    GoogleProvider({
      clientId: googleClientId as string,
      clientSecret: googleClientSecret as string,
    })
  );
}

export const authOptions: AuthOptions = {
  providers,
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "google" && user.email) {
        try {
          const db = await getDb();
          const users = db.collection("users");
          const existing = await users.findOne({ email: user.email });

          if (!existing) {
            await users.insertOne({
              email: user.email,
              name: user.name ?? "",
              image: user.image ?? null,
              password: null,
              role: "customer",
              createdAt: new Date(),
              updatedAt: new Date(),
            });
          } else {
            await users.updateOne(
              { _id: existing._id },
              {
                $set: {
                  name: user.name ?? existing.name ?? "",
                  image: user.image ?? existing.image ?? null,
                  updatedAt: new Date(),
                },
              }
            );
          }
        } catch (error) {
          console.error("Error creating Google user:", error);
        }
      }

      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.role = normalizeRole((user as any).role);
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).role = normalizeRole(String(token.role || "customer"));
      }
      return session;
    },
  },
  secret: authSecret,
};

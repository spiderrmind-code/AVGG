import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & { id: string; role: "admin" | "seller" | "customer" };
  }
  interface User { role?: "admin" | "seller" | "customer"; }
}

declare module "next-auth/jwt" {
  interface JWT { id?: string; role?: "admin" | "seller" | "customer"; }
}

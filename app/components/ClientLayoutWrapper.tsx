"use client";

import { SessionProvider } from "next-auth/react";
import Header from "./Header";
import Footer from "./Footer";
import { CartProvider } from "@/context/CartContext";
import { ThemeProvider } from "@/providers/theme-provider";

export default function ClientLayoutWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ThemeProvider>
      <SessionProvider>
        <CartProvider>
          <Header />

          <main className="flex-1">
            {children}
          </main>

          <Footer />
        </CartProvider>
      </SessionProvider>
    </ThemeProvider>
  );
}
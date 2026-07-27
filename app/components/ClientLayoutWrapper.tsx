"use client";

import { SessionProvider } from "next-auth/react";
import dynamic from "next/dynamic";
import Footer from "./Footer";
import { CartProvider } from "@/context/CartContext";
import { ThemeProvider } from "@/providers/theme-provider";

const Header = dynamic(() => import("./Header"), {
  ssr: false,
});

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
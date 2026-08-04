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

          <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-white focus:p-3">Saltar al contenido</a>
          <main id="main-content" className="flex-1 pt-[104px] md:pt-[110px]">
            {children}
          </main>

          <Footer />
        </CartProvider>
      </SessionProvider>
    </ThemeProvider>
  );
}

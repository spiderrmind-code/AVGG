"use client";

import { SessionProvider } from "next-auth/react";
import Header from "./Header";
import Footer from "./Footer";
import { CartProvider } from "../../context/CartContext";

export default function ClientLayoutWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SessionProvider>
      <CartProvider>
        <Header />

        <main className="flex-1">
          {children}
        </main>

        <Footer />
      </CartProvider>
    </SessionProvider>
  );
}
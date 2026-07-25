// app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";
import ClientLayoutWrapper from "./components/ClientLayoutWrapper";

export const metadata: Metadata = {
  title: "Mi Web",
  description: "Profesional, fondo blanco",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="bg-white text-black flex flex-col min-h-screen">
        <ClientLayoutWrapper>
          {children}
        </ClientLayoutWrapper>
      </body>
    </html>
  );
}

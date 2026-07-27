import type { Metadata } from "next";
import "./globals.css";
import ClientLayoutWrapper from "./components/ClientLayoutWrapper";

export const metadata: Metadata = {
  title: "AVG Connects | Tienda online profesional",
  description: "AVG Connects ofrece productos seleccionados, compra segura, envíos claros y una experiencia ecommerce preparada para vender.",
  openGraph: {
    title: "AVG Connects | Tienda online profesional",
    description: "Compra con confianza en AVG Connects con catálogo, carrito, checkout y pagos seguros.",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className="flex min-h-screen flex-col bg-transparent text-black">
        <ClientLayoutWrapper>{children}</ClientLayoutWrapper>
      </body>
    </html>
  );
}

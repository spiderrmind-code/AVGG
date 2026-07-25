import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "AVG Shop | Ecommerce",
    template: "%s | AVG Shop",
  },
  description:
    "Tienda online de productos seleccionados. Compra fácil, rápido y seguro.",
  keywords: [
    "ecommerce",
    "tienda online",
    "compras online",
    "dropshipping",
    "productos",
  ],
  authors: [{ name: "AVG Shop" }],
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    title: "AVG Shop | Ecommerce",
    description:
      "Tienda online de productos seleccionados. Compra fácil, rápido y seguro.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className={`${inter.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
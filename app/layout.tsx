import type { Metadata } from "next";
import "./globals.css";
import ClientLayoutWrapper from "./components/ClientLayoutWrapper";
import { resolveAppBaseUrl } from "@/lib/app-url";

const appUrl = resolveAppBaseUrl();

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: { default: "AVG Connects | Tienda online profesional", template: "%s | AVG Connects" },
  alternates: { canonical: "/" },
  description: "AVG Connects ofrece productos seleccionados, compra segura, envíos claros y una experiencia ecommerce preparada para vender.",
  openGraph: {
    title: "AVG Connects | Tienda online profesional",
    description: "Compra con confianza en AVG Connects con catálogo, carrito, checkout y pagos seguros.",
    type: "website",
    locale: "es_AR",
    url: appUrl,
  },
  twitter: { card: "summary", title: "AVG Connects | Tienda online profesional", description: "Comprá con confianza en AVG Connects." },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className="flex min-h-screen flex-col bg-transparent text-black">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({ "@context": "https://schema.org", "@graph": [
          { "@type": "Organization", name: "AVG Connects", url: appUrl },
          { "@type": "Store", name: "AVG Connects", url: appUrl },
          { "@type": "WebSite", name: "AVG Connects", url: appUrl, potentialAction: { "@type": "SearchAction", target: `${appUrl}/search?q={search_term_string}`, "query-input": "required name=search_term_string" } },
        ] }).replace(/</g, "\\u003c") }} />
        <ClientLayoutWrapper>{children}</ClientLayoutWrapper>
      </body>
    </html>
  );
}

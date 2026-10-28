import type { Metadata } from "next";
import "./globals.css";
import ClientLayoutWrapper from "./components/ClientLayoutWrapper";
import { resolveAppBaseUrl } from "@/lib/app-url";

const appUrl = resolveAppBaseUrl();

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: { default: "13 Studio Tattoo | Buenos Aires", template: "%s | 13 Studio Tattoo" },
  alternates: { canonical: "/" },
  description: "13 Studio Tattoo. Tatuajes personalizados, artistas y turnos en Buenos Aires.",
  openGraph: {
    title: "13 Studio Tattoo | Buenos Aires",
    description: "Tatuajes personalizados y turnos online.",
    type: "website",
    locale: "es_AR",
    url: appUrl,
    images: [{ url: "https://images.unsplash.com/photo-1562962230-16e4623d36e6?auto=format&fit=crop&w=1200&h=630&q=85", width: 1200, height: 630, alt: "Referencia de tatuaje blackwork" }],
  },
  twitter: { card: "summary_large_image", title: "13 Studio Tattoo", description: "Tatuajes personalizados y turnos online.", images: ["https://images.unsplash.com/photo-1562962230-16e4623d36e6?auto=format&fit=crop&w=1200&h=630&q=85"] },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className="flex min-h-screen flex-col bg-transparent text-black">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({ "@context": "https://schema.org", "@graph": [
          { "@type": "Organization", name: "13 Studio Tattoo", url: appUrl },
          { "@type": "TattooParlor", name: "13 Studio Tattoo", url: appUrl },
          { "@type": "WebSite", name: "13 Studio Tattoo", url: appUrl },
        ] }).replace(/</g, "\\u003c") }} />
        <ClientLayoutWrapper>{children}</ClientLayoutWrapper>
      </body>
    </html>
  );
}

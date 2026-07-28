import type { Metadata } from "next";

export const metadata: Metadata = { title: "Ingresar", description: "Ingresá a tu cuenta de AVG Connects.", robots: { index: false, follow: false } };

export default function LoginLayout({ children }: Readonly<{ children: React.ReactNode }>) { return children; }

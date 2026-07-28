import type { Metadata } from "next";

export const metadata: Metadata = { title: "Mi cuenta", description: "Administrá tus datos y pedidos en AVG Connects.", robots: { index: false, follow: false } };

export default function AccountLayout({ children }: Readonly<{ children: React.ReactNode }>) { return children; }

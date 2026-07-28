import type { Metadata } from "next";

export const metadata: Metadata = { title: "Crear cuenta", description: "Creá tu cuenta para comprar y seguir tus pedidos en AVG Connects.", robots: { index: false, follow: false } };

export default function RegisterLayout({ children }: Readonly<{ children: React.ReactNode }>) { return children; }

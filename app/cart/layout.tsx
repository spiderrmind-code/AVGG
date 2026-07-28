import type { Metadata } from "next";

export const metadata: Metadata = { title: "Carrito", description: "Revisá los productos seleccionados antes de finalizar tu compra.", robots: { index: false, follow: false } };

export default function CartLayout({ children }: Readonly<{ children: React.ReactNode }>) { return children; }

import type { Metadata } from "next";

export const metadata: Metadata = { title: "Checkout", description: "Finalizá tu compra de forma segura en AVG Connects.", robots: { index: false, follow: false } };

export default function CheckoutLayout({ children }: Readonly<{ children: React.ReactNode }>) { return children; }

import type { Metadata } from "next";
import ProductGrid from "./components/ProductGrid";

export const metadata: Metadata = {
  title: "AVG CONNECTS | Tecnología premium",
  description:
    "Descubrí productos de tecnología premium seleccionados para vos.",
};

type Product = {
  _id: string;
  title: string;
  price: number;
  image: string;
};

async function getProducts(): Promise<Product[]> {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_URL ?? "http://localhost:3000"}/api/products`,
      {
        cache: "no-store",
      }
    );

    if (!res.ok) return [];

    const data = await res.json();

    // La API devuelve { success: true, products: [...] }
    // pero se contempla también el caso de que devuelva el array directo
    const products = Array.isArray(data) ? data : data.products;

    if (!Array.isArray(products)) return [];

    return products.map((p: any) => ({
      _id: String(p._id),
      title: p.title ?? p.name ?? "Producto",
      price: Number(p.price ?? 0),
      image: p.image ?? p.images?.[0] ?? "/placeholder-product.png",
    }));
  } catch (error) {
    console.error("Error cargando productos:", error);
    return [];
  }
}

export default async function Page() {
  const products = await getProducts();

  return (
    <main className="min-h-screen bg-white">
      <section className="max-w-7xl mx-auto px-6 pt-32 pb-12">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
          Bienvenido a AVG CONNECTS
        </h1>

        <p className="mt-4 text-gray-500 text-lg">
          Tecnología premium al mejor precio.
        </p>
      </section>

      <section className="max-w-7xl mx-auto px-6 pb-20">
        <ProductGrid products={products} />
      </section>
    </main>
  );
}

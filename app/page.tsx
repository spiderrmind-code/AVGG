import ProductGrid from "./components/ProductGrid";
import BenefitsSection from "./components/BenefitsSection";
import Link from "next/link";

async function getProducts() {
  const res = await fetch("http://localhost:3000/api/products", { cache: "no-store" });
  const data = await res.json();
  return data.products || [];
}

export default async function HomePage() {
  const products = await getProducts();

  return (
    <main className="min-h-screen bg-neutral-50">
      <section className="px-4 py-20 text-center sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl rounded-[2rem] border border-neutral-200 bg-white px-6 py-16 shadow-sm sm:px-10">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-neutral-500">AVG Connects</p>
          <h1 className="mt-4 text-4xl font-semibold sm:text-5xl">Tecnología, estilo y utilidad para comprar con confianza.</h1>
          <p className="mx-auto mt-5 max-w-3xl text-lg text-neutral-600">
            Descubrí productos seleccionados para la vida diaria, con una experiencia de compra más clara, rápida y preparada para convertir visitas en ventas reales.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <a href="#productos" className="rounded-xl bg-black px-5 py-3 text-sm font-semibold text-white">Ver catálogo</a>
            <Link href="/nosotros" className="rounded-xl border border-neutral-300 px-5 py-3 text-sm font-semibold text-neutral-900">Conocé AVG Connects</Link>
          </div>
        </div>
      </section>

      <BenefitsSection />

      <section id="productos" className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-neutral-500">Catálogo</p>
            <h2 className="mt-2 text-2xl font-semibold">Productos pensados para vender y para comprar.</h2>
            <p className="mt-2 max-w-2xl text-sm text-neutral-600">Cada ficha está preparada para mostrar beneficios claros, precio competitivo y una propuesta de compra más sólida.</p>
          </div>
          <Link href="/search" className="text-sm font-semibold text-black">Explorar todo</Link>
        </div>
        <ProductGrid products={products} />
      </section>
    </main>
  );
}
import ProductGrid from "./components/ProductGrid";
import BenefitsSection from "./components/BenefitsSection";
import Hero from "./components/Hero";
import CategoriesSection from "./components/CategoriesSection";
import PromotionsSection from "./components/PromotionsSection";
import Link from "next/link";
import { getDb } from "@/lib/mongo";
import { normalizePublicProduct } from "@/lib/catalog";
import type { Product } from "./components/ProductCard";

export const dynamic = "force-dynamic";

async function getProducts(): Promise<{ products: Product[]; unavailable: boolean }> {
  try {
    const db = await getDb();
    const products = await db
      .collection("products")
      .find({
        active: { $ne: false },
        $or: [{ stock: { $ne: false } }, { stock: { $gt: 0 } }],
      })
      .sort({ featured: -1, createdAt: -1 })
      .limit(100)
      .toArray();

    return { products: products.map((product) => normalizePublicProduct(product)).filter((product): product is NonNullable<typeof product> => product !== null && product.inStock), unavailable: false };
  } catch (error) {
    console.error("ERROR GET PRODUCTS:", error);
    return { products: [], unavailable: true };
  }
}

export default async function Home() {
  const { products, unavailable } = await getProducts();

  return (
    <main className="min-h-screen bg-transparent">
      <Hero product={products?.[0]} />

      {unavailable ? <section className="mx-auto max-w-7xl px-6 pt-8 lg:px-8"><div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-amber-900">El catálogo no está disponible temporalmente. Intentá nuevamente en unos minutos.</div></section> : null}

      <CategoriesSection />

      <PromotionsSection products={products} />

      <section className="mx-auto max-w-7xl px-6 py-8 lg:px-8">
        <div className="premium-shell rounded-[2rem] border border-black/5 bg-white/80 p-6 shadow-[0_24px_90px_rgba(0,0,0,0.06)] backdrop-blur-xl sm:p-8 dark:border-white/10 dark:bg-zinc-900/70">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-neutral-500 dark:text-zinc-400">Colección</p>
              <h3 className="mt-2 text-2xl font-semibold tracking-[-0.02em] text-neutral-950 dark:text-white">Una selección tecnológica pensada para comprar con confianza</h3>
            </div>
            <Link href="/search?q=destacados" className="text-sm font-semibold text-neutral-700 transition hover:text-neutral-950 dark:text-zinc-300 dark:hover:text-white">
              Ver más
            </Link>
          </div>
        </div>
      </section>

      <ProductGrid products={products} />

      <BenefitsSection />
    </main>
  );
}

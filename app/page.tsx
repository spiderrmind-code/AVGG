export const dynamic = "force-dynamic";

import ProductGrid from "./components/ProductGrid";
import BenefitsSection from "./components/BenefitsSection";
import Hero from "./components/Hero";
import CategoriesSection from "./components/CategoriesSection";
import PromotionsSection from "./components/PromotionsSection";
import { getPublicCategories } from "@/lib/public-categories";
import { getPublicCatalog } from "@/lib/public-catalog";
import type { Product } from "./components/ProductCard";

async function getProducts(): Promise<{
  products: Product[];
  unavailable: boolean;
}> {
  try {
    return {
      products: await getPublicCatalog({ limit: 100 }),
      unavailable: false,
    };
  } catch (error) {
    console.error("ERROR GET PRODUCTS:", error);

    return {
      products: [],
      unavailable: true,
    };
  }
}

export default async function Home() {
  const [{ products, unavailable }, categories] = await Promise.all([
    getProducts(),
    getPublicCategories(),
  ]);

  return (
    <main>
      <Hero products={products} categories={categories} />

      {unavailable ? (
        <section className="mx-auto max-w-7xl px-6 pt-8 lg:px-8">
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-amber-900">
            El catálogo no está disponible temporalmente. Intentá nuevamente
            en unos minutos.
          </div>
        </section>
      ) : null}

      <CategoriesSection categories={categories} />

      <ProductGrid products={products} />

      <PromotionsSection
        products={products}
        categories={categories}
      />

      <BenefitsSection />
    </main>
  );
}

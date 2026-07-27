import ProductGrid from "./components/ProductGrid";
import BenefitsSection from "./components/BenefitsSection";
import Hero from "./components/Hero";
import CategoriesSection from "./components/CategoriesSection";
import PromotionsSection from "./components/PromotionsSection";
import Link from "next/link";
import { getDb } from "@/lib/mongo";
import type { Product } from "./components/ProductCard";

async function getProducts(): Promise<Product[]> {
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

    return (products as unknown as any[]).map((product) => ({
      _id: String(product._id),
      title: product.title ?? product.name,
      name: product.name,
      description: product.description,
      price: Number(product.price ?? 0),
      comparePrice: product.comparePrice ? Number(product.comparePrice) : undefined,
      image: product.image ?? product.images?.[0] ?? undefined,
      category: product.category,
      slug: product.slug,
      featured: Boolean(product.featured),
      stock: product.stock,
    })) as Product[];
  } catch (error) {
    console.error("ERROR GET PRODUCTS:", error);
    return [];
  }
}

export default async function Home() {
  const products = await getProducts();

  return (
    <main className="min-h-screen bg-transparent">
      <Hero product={products?.[0]} />

      <CategoriesSection />

      <PromotionsSection products={products} />

      <section className="mx-auto max-w-7xl px-6 py-6 lg:px-8">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-neutral-500">Colección</p>
            <h3 className="mt-2 text-2xl font-semibold tracking-[-0.02em] text-neutral-950">Productos destacados</h3>
          </div>
          <Link href="/search?q=destacados" className="text-sm font-semibold text-neutral-700 transition hover:text-neutral-950">
            Ver más
          </Link>
        </div>
      </section>

      <ProductGrid products={products} />

      <BenefitsSection />
    </main>
  );
}

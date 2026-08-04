import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ProductCard from "@/app/components/ProductCard";
import { buildCategorySearchTerms } from "@/lib/category-routing";
import { isValidCatalogSlug, normalizeCatalogSlug, normalizePublicProduct, type PublicProduct } from "@/lib/catalog";
import { getDb } from "@/lib/mongo";

export const dynamic = "force-dynamic";

async function getCategory(slug: string): Promise<{ name: string; products: PublicProduct[] } | null> {
  if (!isValidCatalogSlug(slug)) return null;
  const normalizedSlug = normalizeCatalogSlug(slug);
  const db = await getDb();
  const [storedCategory, documents] = await Promise.all([
    db.collection("categorias").findOne({ slug: { $regex: `^${normalizedSlug}$`, $options: "i" }, active: { $ne: false } }),
    db.collection("products").find({ active: { $ne: false } }).sort({ featured: -1, createdAt: -1 }).limit(250).toArray(),
  ]);
  const terms = new Set(buildCategorySearchTerms(normalizedSlug).map(normalizeCatalogSlug));
  const products = documents
    .map((document) => normalizePublicProduct(document))
    .filter((product): product is PublicProduct => product !== null && product.inStock)
    .filter((product) => product.categorySlug === normalizedSlug || (product.categorySlug !== null && terms.has(product.categorySlug)));
  const storedName = storedCategory && typeof storedCategory.name === "string" ? storedCategory.name : undefined;
  const productCategoryName = products[0]?.category ?? undefined;
  const name = storedName ?? productCategoryName;
  if (!name) return null;
  return { name, products };
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  try {
    const category = await getCategory(slug);
    if (!category) return { title: "Categoría no encontrada", robots: { index: false, follow: false } };
    return { title: category.name, description: `Explorá productos de ${category.name} en AVG Connects.`, alternates: { canonical: `/category/${encodeURIComponent(slug)}` } };
  } catch {
    return { title: "Categoría", robots: { index: false, follow: false } };
  }
}

export default async function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  let category: Awaited<ReturnType<typeof getCategory>>;
  try {
    category = await getCategory(slug);
  } catch (error) {
    console.error("ERROR CATEGORY PAGE:", error);
    return <main className="min-h-screen px-4 py-16"><div className="mx-auto max-w-3xl rounded-3xl bg-white p-8 text-center shadow-sm"><h1 className="text-2xl font-semibold">No pudimos cargar esta categoría</h1><p className="mt-3 text-neutral-600">Intentá nuevamente en unos minutos.</p></div></main>;
  }
  if (!category) notFound();

  return <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(0,0,0,0.03),_transparent_45%)] px-4 py-16 sm:px-6 lg:px-8"><div className="mx-auto max-w-7xl"><div className="rounded-[2rem] border border-white/70 bg-white/80 p-8 shadow-[0_24px_80px_rgba(0,0,0,0.08)] backdrop-blur-xl"><p className="text-sm font-semibold uppercase tracking-[0.24em] text-neutral-500">Categoría</p><h1 className="mt-2 text-3xl font-semibold tracking-[-0.02em] text-neutral-950">{category.name}</h1><p className="mt-4 text-sm font-medium text-neutral-500">{category.products.length} productos disponibles</p></div>{category.products.length === 0 ? <div className="mt-8 rounded-[2rem] border border-white/70 bg-white/80 p-8 text-center shadow-[0_20px_80px_rgba(0,0,0,0.06)] backdrop-blur-xl"><h2 className="text-xl font-semibold text-neutral-950">No hay productos disponibles</h2><p className="mt-2 text-neutral-600">Esta categoría existe, pero no tiene productos con stock actualmente.</p></div> : <div className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-3">{category.products.map((product) => <ProductCard key={product._id} product={product} />)}</div>}</div></main>;
}

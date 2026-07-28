import Link from "next/link";
import Image from "next/image";
import { getDb } from "@/lib/mongo";
import { PLACEHOLDER_IMAGE } from "@/app/constants/placeholder";
import { escapeRegex, normalizePublicProduct, type PublicProduct } from "@/lib/catalog";

async function getSearchResults(query: string): Promise<PublicProduct[]> {
  if (!query.trim() || query.length > 80) return [];
  const db = await getDb();
  const escapedQuery = escapeRegex(query.trim());
  const products = await db.collection("products").find({
    active: { $ne: false },
    $or: [
      { name: { $regex: escapedQuery, $options: "i" } },
      { title: { $regex: escapedQuery, $options: "i" } },
      { description: { $regex: escapedQuery, $options: "i" } },
      { category: { $regex: escapedQuery, $options: "i" } },
    ],
  }).limit(20).toArray();

  return products.map((product) => normalizePublicProduct(product)).filter((product): product is PublicProduct => product !== null);
}

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = "" } = await searchParams;
  let products: PublicProduct[] = [];
  let unavailable = false;
  try {
    products = q ? await getSearchResults(q) : [];
  } catch (error) {
    console.error("ERROR SEARCH PAGE:", error);
    unavailable = true;
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(0,0,0,0.03),_transparent_45%)] px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="rounded-[2rem] border border-white/70 bg-white/80 p-8 shadow-[0_24px_80px_rgba(0,0,0,0.08)] backdrop-blur-xl">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-neutral-500">Búsqueda</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-[-0.02em] text-neutral-950">Resultados para “{q}”</h1>
          <p className="mt-3 text-neutral-600">Encontrá productos por nombre, categoría o descripción.</p>
        </div>

        {unavailable ? (
          <div className="mt-8 rounded-[2rem] border border-white/70 bg-white/80 p-8 text-center shadow-[0_20px_80px_rgba(0,0,0,0.06)] backdrop-blur-xl"><h2 className="text-xl font-semibold text-neutral-950">No pudimos realizar la búsqueda</h2><p className="mt-2 text-neutral-600">Intentá nuevamente en unos minutos.</p></div>
        ) : products.length === 0 ? (
          <div className="mt-8 rounded-[2rem] border border-white/70 bg-white/80 p-8 text-center shadow-[0_20px_80px_rgba(0,0,0,0.06)] backdrop-blur-xl">
            <h2 className="text-xl font-semibold text-neutral-950">No hay resultados</h2>
            <p className="mt-2 text-neutral-600">Probá con otro término o navegá por nuestras categorías.</p>
          </div>
        ) : (
          <div className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {products.map((product) => {
              const image = product.image ?? PLACEHOLDER_IMAGE;
              const name = product.title ?? product.name ?? "Producto";
              return (
                <Link key={String(product._id)} href={`/product/${product._id}`} className="rounded-[1.6rem] border border-white/70 bg-white/80 p-4 shadow-[0_18px_60px_rgba(0,0,0,0.05)] transition hover:-translate-y-1">
                  <div className="relative aspect-square overflow-hidden rounded-[1.2rem] bg-neutral-100">
                    <Image src={image} alt={name} fill className="object-cover" />
                  </div>
                  <h3 className="mt-4 font-semibold text-neutral-950">{name}</h3>
                  <p className="mt-2 text-sm text-neutral-600">{product.category ?? "Producto premium"}</p>
                  <p className="mt-4 font-semibold text-neutral-950">${product.price}</p>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}

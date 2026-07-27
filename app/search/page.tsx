import Link from "next/link";
import Image from "next/image";
import { getDb } from "@/lib/mongo";
import { PLACEHOLDER_IMAGE } from "@/app/constants/placeholder";

async function getSearchResults(query: string) {
  const db = await getDb();
  const products = await db.collection("products").find({
    $or: [
      { name: { $regex: query, $options: "i" } },
      { title: { $regex: query, $options: "i" } },
      { description: { $regex: query, $options: "i" } },
      { category: { $regex: query, $options: "i" } },
      { sku: { $regex: query, $options: "i" } },
    ],
  }).limit(20).toArray();

  // sanitize product fields for client
  return products.map((p: any) => ({
    _id: String(p._id),
    title: p.title ?? p.name,
    name: p.name,
    description: p.description,
    price: Number(p.price ?? 0),
    comparePrice: p.comparePrice ? Number(p.comparePrice) : undefined,
    image: p.image ?? p.images?.[0] ?? undefined,
    category: p.category,
    sku: p.sku,
  }));
}

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = "" } = await searchParams;
  const products = q ? await getSearchResults(q) : [];

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(0,0,0,0.03),_transparent_45%)] px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="rounded-[2rem] border border-white/70 bg-white/80 p-8 shadow-[0_24px_80px_rgba(0,0,0,0.08)] backdrop-blur-xl">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-neutral-500">Búsqueda</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-[-0.02em] text-neutral-950">Resultados para “{q}”</h1>
          <p className="mt-3 text-neutral-600">Encontrá productos por nombre, categoría o descripción.</p>
        </div>

        {products.length === 0 ? (
          <div className="mt-8 rounded-[2rem] border border-white/70 bg-white/80 p-8 text-center shadow-[0_20px_80px_rgba(0,0,0,0.06)] backdrop-blur-xl">
            <h2 className="text-xl font-semibold text-neutral-950">No hay resultados</h2>
            <p className="mt-2 text-neutral-600">Probá con otro término o navegá por nuestras categorías.</p>
          </div>
        ) : (
          <div className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {products.map((product: any) => {
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

import Link from "next/link";
import Image from "next/image";
import { getDb } from "@/lib/mongo";

async function getSearchResults(query: string) {
  const db = await getDb();
  const products = await db.collection("products").find({
    $or: [
      { name: { $regex: query, $options: "i" } },
      { title: { $regex: query, $options: "i" } },
      { description: { $regex: query, $options: "i" } },
      { category: { $regex: query, $options: "i" } },
    ],
  }).limit(20).toArray();

  return products;
}

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = "" } = await searchParams;
  const products = q ? await getSearchResults(q) : [];

  return (
    <main className="min-h-screen bg-neutral-50 px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="rounded-3xl border border-neutral-200 bg-white p-8 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-neutral-500">Búsqueda</p>
          <h1 className="mt-2 text-3xl font-semibold">Resultados para “{q}”</h1>
          <p className="mt-3 text-neutral-600">Encontrá productos por nombre, categoría o descripción.</p>
        </div>

        {products.length === 0 ? (
          <div className="mt-8 rounded-3xl border border-neutral-200 bg-white p-8 text-center shadow-sm">
            <h2 className="text-xl font-semibold">No hay resultados</h2>
            <p className="mt-2 text-neutral-600">Probá con otro término o navegá por nuestras categorías.</p>
          </div>
        ) : (
          <div className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {products.map((product: any) => {
              const image = product.image ?? "/placeholder-product.png";
              const name = product.title ?? product.name ?? "Producto";
              return (
                <Link key={String(product._id)} href={`/product/${product._id}`} className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm transition hover:-translate-y-1">
                  <div className="relative aspect-square overflow-hidden rounded-xl bg-neutral-100">
                    <Image src={image} alt={name} fill className="object-cover" />
                  </div>
                  <h3 className="mt-4 font-semibold">{name}</h3>
                  <p className="mt-2 text-sm text-neutral-600">{product.category ?? "Producto premium"}</p>
                  <p className="mt-4 font-semibold">${product.price}</p>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}

import Link from "next/link";
import Image from "next/image";
import { getDb } from "@/lib/mongo";
import { PLACEHOLDER_IMAGE } from "@/app/constants/placeholder";

interface ProductRecord {
  _id: string;
  name?: string;
  title?: string;
  description?: string;
  price: number;
  image?: string;
  category?: string;
  stock?: boolean;
}

async function getCategoryProducts(slug: string) {
  const db = await getDb();
  const products = await db.collection("products").find({ category: { $regex: slug, $options: "i" } }).toArray();
  return products.map((product) => ({
    _id: String(product._id),
    name: typeof product.name === "string" ? product.name : undefined,
    title: typeof product.title === "string" ? product.title : undefined,
    description: typeof product.description === "string" ? product.description : undefined,
    price: typeof product.price === "number" ? product.price : 0,
    image: typeof product.image === "string" ? product.image : undefined,
    category: typeof product.category === "string" ? product.category : undefined,
    stock: typeof product.stock === "boolean" ? product.stock : true,
  })) as ProductRecord[];
}

export default async function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const products = await getCategoryProducts(slug);
  const title = slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <main className="min-h-screen bg-neutral-50 px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="rounded-3xl border border-neutral-200 bg-white p-8 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-neutral-500">Categoría</p>
          <h1 className="mt-2 text-3xl font-semibold">{title}</h1>
          <p className="mt-3 max-w-2xl text-neutral-600">Explora los productos disponibles de esta categoría con una experiencia de compra preparada para vender.</p>
          <p className="mt-4 text-sm font-medium text-neutral-500">{products.length} productos disponibles</p>
        </div>

        {products.length === 0 ? (
          <div className="mt-8 rounded-3xl border border-neutral-200 bg-white p-8 text-center shadow-sm">
            <h2 className="text-xl font-semibold">No hay productos todavía</h2>
            <p className="mt-2 text-neutral-600">Pronto agregaremos más productos para esta categoría.</p>
          </div>
        ) : (
          <div className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {products.map((product) => {
              const image = product.image ?? PLACEHOLDER_IMAGE;
              const name = product.title ?? product.name ?? "Producto";
              return (
                <Link key={String(product._id)} href={`/product/${product._id}`} className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm transition hover:-translate-y-1">
                  <div className="relative aspect-square overflow-hidden rounded-xl bg-neutral-100">
                    <Image src={image} alt={name} fill className="object-cover" />
                  </div>
                  <h3 className="mt-4 font-semibold">{name}</h3>
                  <p className="mt-2 text-sm text-neutral-600">{product.description ?? "Producto de alto rendimiento"}</p>
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

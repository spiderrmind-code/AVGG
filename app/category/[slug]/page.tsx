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
  const normalizedSlug = slug.replace(/-/g, " ").trim();
  const products = await db.collection("products").find({
    $and: [
      { active: { $ne: false } },
      {
        $or: [
          { category: { $regex: normalizedSlug, $options: "i" } },
          { name: { $regex: normalizedSlug, $options: "i" } },
          { title: { $regex: normalizedSlug, $options: "i" } },
          { tags: { $elemMatch: { $regex: normalizedSlug, $options: "i" } } },
        ],
      },
    ],
  }).sort({ featured: -1, createdAt: -1 }).toArray();
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
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(0,0,0,0.03),_transparent_45%)] px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="rounded-[2rem] border border-white/70 bg-white/80 p-8 shadow-[0_24px_80px_rgba(0,0,0,0.08)] backdrop-blur-xl">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-neutral-500">Categoría</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-[-0.02em] text-neutral-950">{title}</h1>
          <p className="mt-3 max-w-2xl text-neutral-600">Explora los productos disponibles de esta categoría con una experiencia de compra preparada para vender.</p>
          <p className="mt-4 text-sm font-medium text-neutral-500">{products.length} productos disponibles</p>
        </div>

        {products.length === 0 ? (
          <div className="mt-8 rounded-[2rem] border border-white/70 bg-white/80 p-8 text-center shadow-[0_20px_80px_rgba(0,0,0,0.06)] backdrop-blur-xl">
            <h2 className="text-xl font-semibold text-neutral-950">No hay productos todavía</h2>
            <p className="mt-2 text-neutral-600">Pronto agregaremos más productos para esta categoría.</p>
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
                  <p className="mt-2 text-sm text-neutral-600">{product.description ?? "Producto de alto rendimiento"}</p>
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

import Link from "next/link";
import { catalogCategories } from "@/data/catalog-categories";

export default function CategoriesSection() {
  return (
    <section className="max-w-7xl mx-auto px-6 py-12">
      <h3 className="text-xl font-semibold text-neutral-900">Explorá por categorías</h3>
      <p className="text-sm text-neutral-600 mt-1">Encontrá lo que necesitás en pocas clicks</p>

      <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-6">
        {catalogCategories.map((cat) => (
          <Link key={cat.slug} href={`/category/${cat.slug}`} className="group rounded-3xl overflow-hidden border bg-white p-4 shadow-sm hover:shadow-lg transition">
            <div className="relative h-36 w-full rounded-2xl overflow-hidden bg-neutral-100">
              <img src={cat.image} alt={cat.name} className="object-cover w-full h-full" />
            </div>
            <div className="mt-4">
              <div className="font-semibold text-neutral-900 text-lg">{cat.name}</div>
              <div className="text-sm text-neutral-600 mt-1">{cat.description}</div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

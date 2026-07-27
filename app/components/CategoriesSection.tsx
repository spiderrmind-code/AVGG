import Link from "next/link";
import { catalogCategories } from "@/data/catalog-categories";

export default function CategoriesSection() {
  return (
    <section className="mx-auto max-w-7xl px-6 py-12 lg:px-8">
      <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-neutral-500">Exploración</p>
          <h3 className="mt-2 text-2xl font-semibold tracking-[-0.02em] text-neutral-950">Categorías seleccionadas</h3>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {catalogCategories.map((cat) => (
          <Link key={cat.slug} href={`/category/${cat.slug}`} className="group overflow-hidden rounded-[1.8rem] border border-black/5 bg-white/85 p-4 shadow-[0_20px_70px_rgba(0,0,0,0.05)] backdrop-blur-xl transition hover:-translate-y-1 hover:shadow-[0_28px_90px_rgba(0,0,0,0.08)]">
            <div className="relative h-36 w-full overflow-hidden rounded-[1.3rem] bg-neutral-100">
              <img src={cat.image} alt={cat.name} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
            </div>
            <div className="mt-4">
              <div className="text-lg font-semibold text-neutral-950">{cat.name}</div>
              <div className="mt-1 text-sm leading-6 text-neutral-600">{cat.description}</div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

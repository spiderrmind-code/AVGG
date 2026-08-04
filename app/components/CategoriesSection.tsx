import Link from "next/link";
import Image from "next/image";
import { catalogCategories } from "@/data/catalog-categories";

export default function CategoriesSection() {
  const seenSlugs = new Set<string>();
  const categories = catalogCategories.filter((category) => {
    const name = category.name.trim();
    const slug = category.slug.trim();
    if (!name || !slug || seenSlugs.has(slug)) return false;
    seenSlugs.add(slug);
    return true;
  });

  if (categories.length === 0) return null;

  return (
    <section className="ui-shell ui-section pt-12">
      <div className="mb-8 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="section-label">Exploración</p>
          <h3 className="section-title dark:text-white">Categorías seleccionadas</h3>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-5">
        {categories.map((cat) => (
          <Link key={cat.slug} href={`/category/${cat.slug}`} aria-label={`Explorar categoría ${cat.name}`} className="ui-card ui-card-hover group overflow-hidden p-3.5">
            <div className="ui-product-image relative flex h-40 w-full items-end overflow-hidden bg-[color:var(--color-accent-soft)]">
              {cat.image.trim() ? <Image src={cat.image} alt="" fill sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw" unoptimized className="object-cover transition duration-500 group-hover:scale-105" /> : null}
              <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_25%,rgba(15,23,42,.66))]" />
              <span className="relative z-10 m-3 inline-flex min-h-9 items-center rounded-full bg-white/95 px-3 text-sm font-semibold text-neutral-950 shadow-sm">{cat.name}</span>
            </div>
            <div className="mt-4 px-1 pb-1">
              <div className="flex items-center justify-between gap-3 text-lg font-semibold tracking-[-0.025em] text-neutral-950 dark:text-white"><span>{cat.name}</span><span aria-hidden="true" className="text-[color:var(--color-accent)] transition group-hover:translate-x-0.5">→</span></div>
              <div className="mt-1 text-sm leading-6 text-neutral-600 dark:text-zinc-300">{cat.description}</div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

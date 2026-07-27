import ProductCard from "./ProductCard";

export default function PromotionsSection({ products }: { products: any[] }) {
  const promos = products.filter(p => p.comparePrice && p.comparePrice > p.price).slice(0, 6);

  if (!promos.length) return null;

  const maxDiscount = Math.max(...promos.map(p => p.comparePrice && p.comparePrice > p.price ? Math.round(((p.comparePrice - p.price) / p.comparePrice) * 100) : 0));

  return (
    <section className="mx-auto max-w-7xl px-6 py-12 lg:px-8">
      <div className="mb-8 rounded-[2rem] border border-black/5 bg-[linear-gradient(135deg,rgba(255,255,255,0.95),rgba(248,241,232,0.92))] p-6 shadow-[0_24px_90px_rgba(0,0,0,0.06)] backdrop-blur-xl dark:border-white/10 dark:bg-[linear-gradient(135deg,rgba(17,19,30,0.95),rgba(23,28,36,0.92))] sm:p-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-neutral-500 dark:text-zinc-400">Selección limitada</p>
            <h3 className="mt-2 text-2xl font-semibold tracking-[-0.02em] text-neutral-950 dark:text-white">Ofertas destacadas</h3>
            <p className="mt-2 text-sm leading-6 text-neutral-600 dark:text-zinc-300">Hasta {maxDiscount}% OFF en productos seleccionados para quienes valoran calidad y precio.</p>
          </div>
          <a href="/search?q=ofertas" className="inline-flex items-center justify-center rounded-full border border-neutral-300 bg-white/90 px-4 py-2.5 text-sm font-semibold text-neutral-900 transition hover:-translate-y-0.5 hover:bg-white dark:border-white/10 dark:bg-white/10 dark:text-zinc-100">Ver todas</a>
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {promos.map((p) => (
          <ProductCard key={p._id} product={p} />
        ))}
      </div>
    </section>
  );
}

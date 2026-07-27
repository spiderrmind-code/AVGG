import ProductCard from "./ProductCard";

export default function PromotionsSection({ products }: { products: any[] }) {
  const promos = products.filter(p => p.comparePrice && p.comparePrice > p.price).slice(0, 6);

  if (!promos.length) return null;

  const maxDiscount = Math.max(...promos.map(p => p.comparePrice && p.comparePrice > p.price ? Math.round(((p.comparePrice - p.price) / p.comparePrice) * 100) : 0));

  return (
    <section className="mx-auto max-w-7xl px-6 py-12 lg:px-8">
      <div className="mb-6 flex flex-col gap-2 rounded-[2rem] border border-black/5 bg-white/85 p-6 shadow-[0_22px_90px_rgba(0,0,0,0.05)] backdrop-blur-xl sm:flex-row sm:items-end sm:justify-between dark:border-white/10 dark:bg-zinc-900/70">
        <div>
          <p className="section-label">Selección limitada</p>
          <h3 className="section-title dark:text-white">Ofertas destacadas</h3>
          <p className="section-copy dark:text-zinc-300">Hasta {maxDiscount}% OFF en productos seleccionados.</p>
        </div>
        <a href="/search?q=ofertas" className="text-sm font-semibold text-neutral-700 transition hover:text-neutral-950 dark:text-zinc-300 dark:hover:text-white">Ver todas</a>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {promos.map((p) => (
          <ProductCard key={p._id} product={p} />
        ))}
      </div>
    </section>
  );
}

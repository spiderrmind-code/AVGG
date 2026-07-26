import ProductCard from "./ProductCard";

export default function PromotionsSection({ products }: { products: any[] }) {
  const promos = products.filter(p => p.comparePrice && p.comparePrice > p.price).slice(0, 6);

  if (!promos.length) return null;

  const maxDiscount = Math.max(...promos.map(p => p.comparePrice && p.comparePrice > p.price ? Math.round(((p.comparePrice - p.price) / p.comparePrice) * 100) : 0));

  return (
    <section className="max-w-7xl mx-auto px-6 py-12">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-extrabold text-neutral-900">Ofertas destacadas</h3>
          <p className="text-sm text-neutral-600">Hasta {maxDiscount}% OFF en seleccionados • Oferta por tiempo limitado</p>
        </div>
        <a href="/search?q=ofertas" className="text-sm font-semibold text-[#ff007f]">Ver todas</a>
      </div>

      <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6">
        {promos.map((p) => (
          <ProductCard key={p._id} product={p} />
        ))}
      </div>
    </section>
  );
}

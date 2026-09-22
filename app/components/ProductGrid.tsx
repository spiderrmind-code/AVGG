import ProductCard, { Product } from "./ProductCard";


interface ProductGridProps {
  products: Product[];
}


export default function ProductGrid({
  products,
}: ProductGridProps) {

  if (!products?.length) {
    return (
      <section className="ui-shell ui-section">
        <div className="ui-surface p-8 text-center">
          <p className="text-lg font-semibold text-neutral-950 dark:text-white">No hay productos disponibles.</p>
          <p className="mt-2 text-sm text-neutral-600 dark:text-zinc-300">Pronto incorporaremos nuevos lanzamientos a la colección.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="marketplace-product-grid ui-shell pb-12 sm:pb-16">
      <div className="marketplace-shelf-header mb-8 flex items-end justify-between gap-4">
        <div>
          <p className="section-label">Colección</p>
          <h3 className="section-title dark:text-white">Productos seleccionados</h3>
        </div>
        <div className="hidden items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] text-neutral-500 sm:flex">
          <span className="inline-flex h-2.5 w-2.5 rounded-full bg-[color:var(--color-success)]" />
          Disponible ahora
        </div>
      </div>
      <div className="marketplace-product-grid-inner grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4 lg:gap-5 xl:gap-6">
        {products.map((product) => (
          <ProductCard key={product._id} product={product} />
        ))}
      </div>
    </section>
  );
}

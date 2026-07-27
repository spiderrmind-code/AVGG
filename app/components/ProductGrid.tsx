import ProductCard, { Product } from "./ProductCard";


interface ProductGridProps {
  products: Product[];
}


export default function ProductGrid({
  products,
}: ProductGridProps) {

  if (!products?.length) {
    return (
      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="rounded-[2rem] border border-white/70 bg-white/80 p-8 text-center shadow-[0_20px_80px_rgba(0,0,0,0.06)] backdrop-blur-xl dark:border-white/10 dark:bg-zinc-900/70">
          <p className="text-lg font-semibold text-neutral-950 dark:text-white">No hay productos disponibles.</p>
          <p className="mt-2 text-sm text-neutral-600 dark:text-zinc-300">Pronto incorporaremos nuevos lanzamientos a la colección.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
      <div className="mb-6 flex items-end justify-between gap-3">
        <div>
          <p className="section-label">Colección</p>
          <h3 className="section-title dark:text-white">Productos seleccionados</h3>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {products.map((product) => (
          <ProductCard key={product._id} product={product} />
        ))}
      </div>
    </section>
  );
}
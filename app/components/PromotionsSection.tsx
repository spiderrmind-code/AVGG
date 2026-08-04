import ProductCard from "./ProductCard";
import type { Product } from "./ProductCard";

function isPublicOffer(product: Product) {
  const price = Number(product.price);
  const comparePrice = Number(product.comparePrice);
  const hasImage = Boolean(product.image?.trim() || product.images?.some((image) => image.trim()));

  return product.inStock === true
    && Number.isFinite(price)
    && price > 0
    && Number.isFinite(comparePrice)
    && comparePrice > price
    && hasImage;
}

export default function PromotionsSection({ products }: { products: Product[] }) {
  // Sólo usa datos públicos verificables: ahorro existente, imagen y disponibilidad.
  // El costo y el margen no se consumen ni se exponen en el cliente.
  const promos = products.filter(isPublicOffer).slice(0, 6);

  if (!promos.length) return null;

  const maxDiscount = Math.max(...promos.map(p => p.comparePrice && p.comparePrice > p.price ? Math.round(((p.comparePrice - p.price) / p.comparePrice) * 100) : 0));

  return (
    <section id="ofertas" className="marketplace-promotions ui-shell ui-section pt-5">
      <div className="ui-commerce-panel mb-8 p-6 sm:p-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-neutral-500 dark:text-zinc-400">Selección limitada</p>
            <h3 className="mt-2 text-2xl font-semibold tracking-[-0.02em] text-neutral-950 dark:text-white">Ofertas destacadas</h3>
            <p className="mt-2 text-sm leading-6 text-neutral-600 dark:text-zinc-300">Hasta {maxDiscount}% OFF en productos seleccionados para quienes valoran calidad y precio.</p>
          </div>
          <a href="#ofertas" className="ui-button-secondary w-full sm:w-auto">Ver todas</a>
        </div>
      </div>

      <div className="marketplace-offer-grid grid grid-cols-2 gap-2.5 sm:gap-4 lg:grid-cols-4 lg:gap-5">
        {promos.map((p) => (
          <ProductCard key={p._id} product={p} />
        ))}
      </div>
    </section>
  );
}

import ProductCard, { Product } from "./ProductCard";

interface ProductGridProps {
  products: Product[];
}

export default function ProductGrid({
  products,
}: ProductGridProps) {

  if (!products || products.length === 0) {
    return (
      <section className="p-6 text-center">
        <p>
          No hay productos disponibles.
        </p>
      </section>
    );
  }


  return (
    <section className="
      grid 
      grid-cols-1 
      sm:grid-cols-2 
      md:grid-cols-3 
      lg:grid-cols-4 
      gap-6 
      p-6
    ">
      {products.map((product) => (
        <ProductCard
          key={product._id}
          product={product}
        />
      ))}
    </section>
  );
}
import ProductDetails from "@/app/components/ProductDetails";

async function getProduct(id: string) {
  const res = await fetch(`http://localhost:3000/api/products/${id}`, { cache: "no-store" });
  const data = await res.json();

  if (!res.ok || !data?.success) {
    return null;
  }

  return data.product ?? null;
}

async function getRelatedProducts() {
  const res = await fetch("http://localhost:3000/api/products", { cache: "no-store" });
  const data = await res.json();
  return Array.isArray(data?.products) ? data.products : [];
}

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const product = await getProduct(id);
  const relatedProducts = await getRelatedProducts();

  if (!product) {
    return (
      <main className="min-h-screen bg-neutral-50 px-4 py-16 text-center sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl rounded-3xl border border-neutral-200 bg-white p-8 shadow-sm">
          <h1 className="text-3xl font-semibold">Producto no encontrado</h1>
          <p className="mt-3 text-neutral-600">El producto que buscás no existe o ya no está disponible.</p>
        </div>
      </main>
    );
  }

  return <ProductDetails product={product} relatedProducts={relatedProducts} />;
}
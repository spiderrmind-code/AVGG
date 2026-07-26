"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCart } from "@/app/context/CartContext";
import { PLACEHOLDER_IMAGE } from "@/app/constants/placeholder";

export default function Hero({ product }: { product?: any }) {
  const router = useRouter();
  const { addToCart } = useCart();

  function handleBuyNow() {
    if (product && product._id) {
      addToCart({ _id: String(product._id), name: product.name ?? product.title ?? "Producto", price: Number(product.price ?? 0), comparePrice: Number(product.comparePrice ?? product.oldPrice ?? 0) || undefined, image: product.image ?? product.images?.[0] ?? PLACEHOLDER_IMAGE }, 1);
      router.push('/checkout');
      return;
    }
    router.push('/search?q=ofertas');
  }

  return (
    <section className="bg-gradient-to-r from-white via-neutral-50 to-white">
      <div className="max-w-7xl mx-auto px-6 py-16 lg:py-24 flex flex-col lg:flex-row items-center gap-10">
        <div className="flex-1">
          <h2 className="text-sm font-semibold text-[#ff007f]">Novedades · Selección premium</h2>
          <h1 className="mt-4 text-4xl sm:text-5xl font-extrabold text-neutral-900">Tecnología que conecta. Experiencias que elevan.</h1>
          <p className="mt-4 text-neutral-600 max-w-xl">Descubrí productos seleccionados por su diseño, rendimiento y valor. Envíos rápidos, pagos seguros y garantía real.</p>

          <div className="mt-6 flex gap-3">
            <button onClick={handleBuyNow} className="rounded-full bg-[#ff007f] px-6 py-3 font-semibold text-black">Comprar ahora</button>
            <a href="/search?q=tecnologia" className="rounded-full border border-neutral-200 px-5 py-3 text-neutral-700">Ver colección</a>
          </div>
        </div>

        <div className="w-full max-w-md">
          <div className="rounded-2xl border bg-white p-4 shadow-lg">
            <div className="relative h-64 w-full overflow-hidden rounded-xl bg-neutral-100">
              <Image src={product?.image ?? PLACEHOLDER_IMAGE} alt={product?.name ?? product?.title ?? 'Producto destacado'} fill className="object-cover" />
            </div>
            <div className="mt-4">
              <div className="text-sm text-neutral-500">Destacado</div>
              <h3 className="font-semibold text-lg text-neutral-900">{product?.name ?? product?.title ?? 'Producto seleccionado'}</h3>
              <div className="mt-2 text-xl font-bold">${(Number(product?.price ?? 0)).toLocaleString('es-AR')}</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
    
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
      router.push("/checkout");
      return;
    }
    router.push("/search?q=ofertas");
  }

  return (
    <section className="relative overflow-hidden border-b border-white/40 bg-[radial-gradient(circle_at_top_left,_rgba(255,0,127,0.16),_transparent_35%),linear-gradient(135deg,_#f7f7f8_0%,_#f0f0f2_100%)]">
      <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(17,17,17,0.03),transparent)]" />
      <div className="relative mx-auto flex max-w-7xl flex-col gap-10 px-6 py-16 lg:flex-row lg:items-center lg:py-24 lg:px-8">
        <div className="max-w-2xl flex-1">
          <div className="inline-flex items-center rounded-full border border-black/10 bg-white/70 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.3em] text-neutral-600 backdrop-blur-xl">
            Tecnología premium · Nuevo lanzamiento
          </div>
          <h1 className="mt-6 text-4xl font-semibold tracking-[-0.03em] text-neutral-950 sm:text-5xl lg:text-6xl">
            La experiencia de compra, redefinida.
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-8 text-neutral-600">
            Productos seleccionados con diseño, rendimiento y la confianza de una marca que piensa en detalle.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <button onClick={handleBuyNow} className="rounded-full bg-neutral-950 px-6 py-3 text-sm font-semibold text-white shadow-[0_10px_40px_rgba(0,0,0,0.12)] transition hover:-translate-y-0.5">
              Comprar ahora
            </button>
            <a href="/search?q=tecnologia" className="rounded-full border border-black/10 bg-white/70 px-6 py-3 text-sm font-semibold text-neutral-700 backdrop-blur-xl transition hover:-translate-y-0.5">
              Explorar colección
            </a>
          </div>
        </div>

        <div className="w-full max-w-lg">
          <div className="rounded-[2rem] border border-white/70 bg-white/70 p-4 shadow-[0_30px_90px_rgba(0,0,0,0.08)] backdrop-blur-2xl">
            <div className="relative h-[380px] overflow-hidden rounded-[1.5rem] bg-neutral-100">
              <Image src={product?.image ?? PLACEHOLDER_IMAGE} alt={product?.name ?? product?.title ?? "Producto destacado"} fill className="object-cover" />
              <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_0%,rgba(0,0,0,0.2)_100%)]" />
            </div>
            <div className="mt-4 flex items-end justify-between gap-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-neutral-500">Destacado</p>
                <h3 className="mt-1 text-xl font-semibold text-neutral-950">{product?.name ?? product?.title ?? "Producto seleccionado"}</h3>
              </div>
              <div className="rounded-full bg-neutral-950 px-3 py-1 text-sm font-semibold text-white">
                ${Number(product?.price ?? 0).toLocaleString("es-AR")}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
    
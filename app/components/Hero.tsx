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
    <section className="relative overflow-hidden border-b border-white/40 bg-[radial-gradient(circle_at_top_left,_rgba(255,47,146,0.16),_transparent_30%),radial-gradient(circle_at_bottom_right,_rgba(255,255,255,0.35),_transparent_40%),linear-gradient(135deg,_#f7f0e6_0%,_#efe7dd_55%,_#f8f4ee_100%)] dark:bg-[radial-gradient(circle_at_top_left,_rgba(255,47,146,0.2),_transparent_24%),radial-gradient(circle_at_bottom_right,_rgba(255,255,255,0.08),_transparent_35%),linear-gradient(135deg,_#08090d_0%,_#0f1117_50%,_#131622_100%)]">
      <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(17,17,17,0.04),transparent)]" />
      <div className="floating-orb absolute -left-8 top-16 h-56 w-56 rounded-full bg-white/70 blur-3xl dark:bg-pink-500/20" />
      <div className="floating-orb absolute right-[-6%] top-[-10%] h-72 w-72 rounded-full bg-[#ff2f92]/20 blur-3xl" />
      <div className="absolute bottom-0 left-1/2 h-40 w-[70%] -translate-x-1/2 rounded-full bg-white/30 blur-[120px] dark:bg-pink-500/10" />
      <div className="relative mx-auto flex max-w-7xl flex-col gap-10 px-6 py-20 sm:px-8 lg:flex-row lg:items-center lg:py-28 lg:px-8">
        <div className="max-w-2xl flex-1">
          <div className="brand-pill">
            Tecnología premium · Nuevo lanzamiento
          </div>
          <h1 className="mt-6 text-4xl font-semibold leading-[0.95] tracking-[-0.035em] text-neutral-950 dark:text-white sm:text-5xl lg:text-6xl">
            Tecnología premium, compra simple y confiable.
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-8 text-neutral-600 dark:text-zinc-300">
            Descubrí productos seleccionados con diseño, rendimiento y una experiencia de compra clara, segura y preparada para vender.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <button onClick={handleBuyNow} className="theme-btn w-full sm:w-auto">
              Comprar ahora
            </button>
            <a href="/search?q=tecnologia" className="theme-btn-secondary w-full sm:w-auto">
              Ver catálogo
            </a>
          </div>

          <div className="mt-8 flex flex-wrap gap-3 text-sm text-neutral-600 dark:text-zinc-300">
            <span className="rounded-full border border-black/10 bg-white/75 px-3 py-2 shadow-[0_8px_24px_rgba(0,0,0,0.04)] dark:border-white/10 dark:bg-white/10">Envíos con seguimiento</span>
            <span className="rounded-full border border-black/10 bg-white/75 px-3 py-2 shadow-[0_8px_24px_rgba(0,0,0,0.04)] dark:border-white/10 dark:bg-white/10">Pago seguro</span>
            <span className="rounded-full border border-black/10 bg-white/75 px-3 py-2 shadow-[0_8px_24px_rgba(0,0,0,0.04)] dark:border-white/10 dark:bg-white/10">Soporte real</span>
          </div>
        </div>

        <div className="w-full max-w-lg">
          <div className="premium-ring brand-card surface-glow p-4 sm:p-5">
            <div className="relative h-[420px] overflow-hidden rounded-[1.6rem] bg-neutral-100 dark:bg-zinc-900">
              <Image src={product?.image ?? PLACEHOLDER_IMAGE} alt={product?.name ?? product?.title ?? "Producto destacado"} fill sizes="(max-width: 768px) 100vw, 45vw" priority className="object-cover" />
              <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_0%,rgba(0,0,0,0.16)_100%)]" />
              <div className="absolute left-4 top-4 rounded-full border border-white/60 bg-white/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.3em] text-neutral-700 backdrop-blur">
                Destacado
              </div>
            </div>
            <div className="mt-4 flex items-end justify-between gap-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-neutral-500 dark:text-zinc-400">Producto seleccionado</p>
                <h3 className="mt-1 text-xl font-semibold text-neutral-950 dark:text-white">{product?.name ?? product?.title ?? "Producto seleccionado"}</h3>
              </div>
              <div className="rounded-full bg-neutral-950 px-3 py-1 text-sm font-semibold text-white dark:bg-white dark:text-neutral-950">
                ${Number(product?.price ?? 0).toLocaleString("es-AR")}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
    
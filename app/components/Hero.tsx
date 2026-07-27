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
    <section className="relative overflow-hidden border-b border-white/40 bg-[radial-gradient(circle_at_top_left,_rgba(255,47,146,0.18),_transparent_30%),radial-gradient(circle_at_bottom_right,_rgba(255,255,255,0.45),_transparent_40%),linear-gradient(135deg,_#f8efe7_0%,_#f0e0cf_45%,_#f8f2ea_100%)] dark:bg-[radial-gradient(circle_at_top_left,_rgba(255,47,146,0.24),_transparent_24%),radial-gradient(circle_at_bottom_right,_rgba(255,255,255,0.08),_transparent_35%),linear-gradient(135deg,_#07080d_0%,_#0f1117_50%,_#131622_100%)]">
      <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(17,17,17,0.03),transparent)]" />
      <div className="absolute -left-10 top-12 h-64 w-64 rounded-full bg-white/70 blur-[120px] dark:bg-pink-500/20" />
      <div className="absolute right-[-8%] top-[-12%] h-80 w-80 rounded-full bg-[#ff2f92]/20 blur-[140px]" />
      <div className="absolute bottom-0 left-1/2 h-48 w-[75%] -translate-x-1/2 rounded-full bg-white/35 blur-[140px] dark:bg-pink-500/10" />
      <div className="relative mx-auto flex max-w-7xl flex-col gap-10 px-6 py-20 sm:px-8 lg:flex-row lg:items-center lg:py-28 lg:px-8">
        <div className="max-w-2xl flex-1">
          <div className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white/80 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.3em] text-neutral-700 shadow-[0_8px_24px_rgba(0,0,0,0.04)] backdrop-blur dark:border-white/10 dark:bg-white/10 dark:text-zinc-200">
            <span className="h-2.5 w-2.5 rounded-full bg-rose-500" />
            Ofertas exclusivas · Compra segura
          </div>
          <h1 className="mt-6 text-4xl font-semibold leading-[0.95] tracking-[-0.035em] text-neutral-950 dark:text-white sm:text-5xl lg:text-6xl">
            Tecnología premium, comprada con confianza y velocidad.
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-8 text-neutral-600 dark:text-zinc-300">
            Descubrí productos seleccionados con diseño, rendimiento y una experiencia de compra limpia, rápida y preparada para vender.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <button onClick={handleBuyNow} className="w-full rounded-full bg-neutral-950 px-6 py-3.5 text-sm font-semibold text-white shadow-[0_16px_45px_rgba(0,0,0,0.18)] transition hover:-translate-y-0.5 hover:bg-neutral-800 active:scale-[0.98] sm:w-auto">
              Comprar ahora
            </button>
            <a href="/#destacados" className="w-full rounded-full border border-neutral-300 bg-white/80 px-6 py-3.5 text-center text-sm font-semibold text-neutral-900 shadow-[0_12px_30px_rgba(0,0,0,0.06)] transition hover:-translate-y-0.5 hover:bg-white sm:w-auto dark:border-white/10 dark:bg-white/10 dark:text-zinc-100">
              Explorar productos
            </a>
          </div>

          <div className="mt-8 flex flex-wrap gap-3 text-sm text-neutral-600 dark:text-zinc-300">
            <span className="rounded-full border border-black/10 bg-white/75 px-3 py-2 shadow-[0_8px_24px_rgba(0,0,0,0.04)] dark:border-white/10 dark:bg-white/10">Envíos con seguimiento</span>
            <span className="rounded-full border border-black/10 bg-white/75 px-3 py-2 shadow-[0_8px_24px_rgba(0,0,0,0.04)] dark:border-white/10 dark:bg-white/10">Pago seguro</span>
            <span className="rounded-full border border-black/10 bg-white/75 px-3 py-2 shadow-[0_8px_24px_rgba(0,0,0,0.04)] dark:border-white/10 dark:bg-white/10">Soporte real</span>
          </div>
        </div>

        <div className="w-full max-w-lg">
          <div className="rounded-[2rem] border border-white/70 bg-white/80 p-4 shadow-[0_24px_90px_rgba(0,0,0,0.08)] backdrop-blur-xl sm:p-5 dark:border-white/10 dark:bg-zinc-900/70">
            <div className="relative h-[420px] overflow-hidden rounded-[1.6rem] bg-neutral-100 dark:bg-zinc-900">
              <Image src={product?.image ?? PLACEHOLDER_IMAGE} alt={product?.name ?? product?.title ?? "Producto destacado"} fill sizes="(max-width: 768px) 100vw, 45vw" priority className="object-cover" />
              <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_0%,rgba(0,0,0,0.16)_100%)]" />
              <div className="absolute left-4 top-4 rounded-full border border-white/60 bg-white/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.3em] text-neutral-700 backdrop-blur">
                Producto destacado
              </div>
              <div className="absolute bottom-4 right-4 rounded-full bg-white/90 px-3 py-2 text-sm font-semibold text-neutral-950 shadow-lg backdrop-blur">
                ${Number(product?.price ?? 0).toLocaleString("es-AR")}
              </div>
            </div>
            <div className="mt-4 flex items-end justify-between gap-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-neutral-500 dark:text-zinc-400">Selección premium</p>
                <h3 className="mt-1 text-xl font-semibold text-neutral-950 dark:text-white">{product?.name ?? product?.title ?? "Producto seleccionado"}</h3>
              </div>
              <div className="rounded-full border border-neutral-200 bg-neutral-50 px-3 py-1 text-sm font-semibold text-neutral-700 dark:border-white/10 dark:bg-white/10 dark:text-zinc-200">
                Envío rápido
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
    
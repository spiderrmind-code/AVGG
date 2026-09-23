"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { PLACEHOLDER_IMAGE } from "@/app/constants/placeholder";
import { formatARS } from "@/lib/currency";
import type { Product } from "./ProductCard";

type HeroCategory = { name: string; slug: string; description?: string; image?: string };
type Props = { products: Product[]; categories: HeroCategory[] };

function getTitle(product: Product) {
  return product.name ?? product.title ?? "Producto destacado";
}

function getImage(product: Product) {
  return product.image ?? product.images?.[0] ?? PLACEHOLDER_IMAGE;
}

function getDiscount(product: Product) {
  if (!product.comparePrice || product.comparePrice <= product.price) return null;
  return Math.round(((product.comparePrice - product.price) / product.comparePrice) * 100);
}

function getSavings(product: Product) {
  if (!product.comparePrice || product.comparePrice <= product.price) return null;
  return product.comparePrice - product.price;
}

export default function Hero({ products }: Props) {
  const discountedProducts = products.filter((product) => getDiscount(product) !== null);
  const featuredProducts = products.filter((product) => product.featured && getDiscount(product) === null);
  const prioritizedProducts = new Set([...discountedProducts, ...featuredProducts]);
  const orderedProducts = [
    ...discountedProducts,
    ...featuredProducts,
    ...products.filter((product) => !prioritizedProducts.has(product)),
  ];

  const visibleProducts = orderedProducts.slice(0, 4);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (visibleProducts.length < 2 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const interval = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % visibleProducts.length);
    }, 2000);

    return () => window.clearInterval(interval);
  }, [visibleProducts.length]);

  const leadProduct = visibleProducts[activeIndex % visibleProducts.length];
  const secondaryProducts = visibleProducts.filter((_, index) => index !== activeIndex);
  const composition = activeIndex % 3;

  if (!leadProduct) return null;

  const leadDiscount = getDiscount(leadProduct);
  const leadSavings = getSavings(leadProduct);
  const leadHref = `/product/${leadProduct._id}`;

  return (
    <section
      className="marketplace-hero-wrap border-b border-[color:var(--color-border)]"
      aria-label="Ofertas destacadas"
    >
      <div className="ui-shell py-3 sm:py-4 lg:py-5">
        <div className={`marketplace-hero hero-future-surface hero-composition-${composition} relative isolate overflow-hidden rounded-[var(--radius-xl)] border border-white/20 px-4 py-5 shadow-[var(--shadow-strong)] sm:px-6 sm:py-6 lg:px-8 lg:py-8`}>
          <div className="marketplace-hero-sun" aria-hidden="true" />
          <div className="marketplace-hero-grid" aria-hidden="true" />

          <div className="home-hero-header relative z-10 mb-4 flex items-end justify-between gap-3 sm:mb-6">
            <div className="min-w-0">
              <p className="home-hero-kicker ui-eyebrow text-white/75">Descubrí. Elegí. Comprá inteligente.</p>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <h1 className="home-hero-title text-[1.9rem] font-bold tracking-[-0.065em] text-white sm:text-3xl lg:text-5xl">
                  AVG CONNECTS
                </h1>
                <span className="ui-offer-badge text-[0.62rem] sm:text-[0.7rem]">Productos reales</span>
              </div>
            </div>

            <Link
              href="/#destacados"
              className="home-hero-link hidden shrink-0 text-sm font-semibold text-white/90 transition hover:text-white sm:inline-flex"
            >
              Ver todos →
            </Link>
          </div>

          <div className="relative z-10 grid gap-4 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1.55fr)] lg:gap-5">
            <article key={String(leadProduct._id)} className="home-hero-focus animate-[heroSlideIn_500ms_ease-out] group relative overflow-hidden rounded-[var(--radius-xl)] border border-white/15 bg-white/10 p-3 backdrop-blur-sm sm:p-5">
              <Link href={leadHref} className="block">
                <div className="relative aspect-[16/10] overflow-hidden rounded-[calc(var(--radius-xl)-0.35rem)] bg-[color:var(--color-surface-strong)]">
                  <Image
                    src={getImage(leadProduct)}
                    alt={getTitle(leadProduct)}
                    fill
                    priority
                    sizes="(max-width: 1024px) 100vw, 40vw"
                    className="object-contain p-5 transition duration-300 group-hover:scale-[1.03] sm:p-7"
                  />

                  <div className="absolute left-3 top-3 flex flex-wrap gap-2">
                    {leadDiscount !== null ? (
                      <span className="ui-offer-badge">{leadDiscount}% OFF</span>
                    ) : (
                      <span className="ui-badge">Elegido AVG</span>
                    )}
                    {leadProduct.featured ? <span className="ui-badge">Destacado</span> : null}
                  </div>
                </div>
              </Link>

              <div className="home-hero-copy mt-4">
                <p className="home-hero-meta ui-eyebrow text-white/70">
                  {leadProduct.category ?? "Selección AVG"}
                </p>

                <Link href={leadHref} className="mt-1 block">
                  <h2 className="home-hero-product-title line-clamp-2 text-xl font-bold leading-[0.96] tracking-[-0.05em] text-white sm:text-2xl lg:text-[2.05rem]">
                    {getTitle(leadProduct)}
                  </h2>
                </Link>

                <div className="mt-3 flex flex-wrap items-end gap-x-3 gap-y-1">
                  <span className="home-hero-price text-3xl font-extrabold tracking-[-0.06em] text-white sm:text-4xl">
                    {formatARS(Number(leadProduct.price ?? 0))}
                  </span>

                  {leadProduct.comparePrice && leadProduct.comparePrice > leadProduct.price ? (
                    <span className="pb-1 text-sm text-white/60 line-through">
                      {formatARS(Number(leadProduct.comparePrice))}
                    </span>
                  ) : null}
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {leadSavings ? (
                    <span className="ui-offer-badge text-[0.62rem] sm:text-[0.7rem]">
                      Ahorrás {formatARS(leadSavings)}
                    </span>
                  ) : null}

                  <Link href={leadHref} className="home-hero-cta ui-button-primary ml-auto min-w-[8.25rem]">
                    Ver oferta
                  </Link>
                </div>
              </div>
            </article>

            <div
              className="home-hero-grid grid auto-cols-[72%] grid-flow-col gap-3 overflow-x-auto overscroll-x-contain pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:auto-cols-[44%] lg:grid-flow-row lg:grid-cols-3 lg:overflow-visible lg:pb-0"
              aria-label="Más ofertas"
            >
              {secondaryProducts.map((product, index) => {
                const discount = getDiscount(product);
                const href = `/product/${product._id}`;

                return (
                  <article
                    key={String(product._id)}
                    className="group flex min-w-0 flex-col overflow-hidden rounded-[var(--radius-lg)] border border-[color:var(--color-border)] bg-[color:var(--color-surface-strong)] shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                  >
                    <Link href={href} className="block">
                      <div className="relative aspect-[4/3] overflow-hidden bg-[color:var(--color-surface)]">
                        <Image
                          src={getImage(product)}
                          alt={getTitle(product)}
                          fill
                          sizes="(max-width: 640px) 72vw, (max-width: 1024px) 44vw, 18vw"
                          className="object-contain p-3 transition duration-300 group-hover:scale-[1.04] sm:p-4"
                        />

                        <div className="absolute left-2.5 top-2.5">
                          {discount !== null ? (
                            <span className="ui-offer-badge">{discount}% OFF</span>
                          ) : product.featured ? (
                            <span className="ui-badge">Elegido AVG</span>
                          ) : (
                            <span className="ui-badge">Descubrí</span>
                          )}
                        </div>

                        {index === 0 && discount !== null ? (
                          <span className="absolute right-2.5 top-2.5 rounded-full bg-[color:var(--color-surface-strong)] px-2 py-1 text-[0.625rem] font-bold uppercase tracking-[0.12em] text-[color:var(--color-text)] shadow-sm">
                            Hot
                          </span>
                        ) : null}
                      </div>
                    </Link>

                    <div className="flex flex-1 flex-col p-3 sm:p-3.5">
                      <p className="truncate text-[0.6875rem] font-semibold uppercase tracking-[0.12em] text-[color:var(--color-text-subtle)]">
                        {product.category ?? "AVG"}
                      </p>

                      <Link href={href} className="mt-1 block">
                        <h3 className="line-clamp-2 min-h-[2.5rem] text-sm font-semibold leading-5 text-[color:var(--color-text)]">
                          {getTitle(product)}
                        </h3>
                      </Link>

                      <div className="mt-auto pt-3">
                        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                          <span className="text-lg font-extrabold tracking-[-0.025em] text-[color:var(--color-text)] sm:text-xl">
                            {formatARS(Number(product.price ?? 0))}
                          </span>

                          {product.comparePrice && product.comparePrice > product.price ? (
                            <span className="text-xs text-[color:var(--color-text-subtle)] line-through">
                              {formatARS(Number(product.comparePrice))}
                            </span>
                          ) : null}
                        </div>

                        <Link
                          href={href}
                          className="mt-2 inline-flex text-xs font-bold text-[color:var(--color-accent)] transition hover:opacity-80"
                        >
                          Ver producto →
                        </Link>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>

          <div className="relative z-10 mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-white/15 pt-4">
            <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs font-medium text-white/75 sm:text-sm">
              <span>Compra segura</span>
              <span>Envío con seguimiento</span>
              <span>Soporte real</span>
            </div>

            <div className="hero-scene-status" aria-live="polite">
              <span>{String(composition + 1).padStart(2, "0")} / 03</span>
              <span className="hero-scene-progress" aria-hidden="true">
                <span key={activeIndex} className="hero-scene-progress-fill" />
              </span>
            </div>

            <Link
              href="/#destacados"
              className="text-sm font-semibold text-white transition hover:text-white/80 sm:hidden"
            >
              Ver todos →
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCart } from "@/app/context/CartContext";
import { PLACEHOLDER_IMAGE } from "@/app/constants/placeholder";
import { formatARS } from "@/lib/currency";
import { catalogCategories, type CatalogCategory } from "@/data/catalog-categories";
import type { Product } from "./ProductCard";

type Props = { products: Product[] };
type ProductSlide = { kind: "product"; product: Product };
type CategorySlide = { kind: "category"; category: CatalogCategory };
type HeroSlide = ProductSlide | CategorySlide;

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

export default function Hero({ products }: Props) {
  const router = useRouter();
  const { addToCart } = useCart();
  const discountedProducts = products.filter((product) => getDiscount(product) !== null);
  const featuredProducts = products.filter((product) => product.featured && getDiscount(product) === null);
  const prioritizedProducts = new Set([...discountedProducts, ...featuredProducts]);
  const orderedProducts = [...discountedProducts, ...featuredProducts, ...products.filter((product) => !prioritizedProducts.has(product))];
  const productSlides: ProductSlide[] = orderedProducts.slice(0, 5).map((product) => ({ kind: "product", product }));
  const slides: HeroSlide[] = productSlides.length === 1 && catalogCategories[0]
    ? [...productSlides, { kind: "category", category: catalogCategories[0] }]
    : productSlides;
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(() => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  const touchStartX = useRef<number | null>(null);
  const activeSlide = slides[activeIndex] ?? slides[0];
  const product = activeSlide?.kind === "product" ? activeSlide.product : products[0];
  const isCategorySlide = activeSlide?.kind === "category";

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handleChange = (event: MediaQueryListEvent) => setPrefersReducedMotion(event.matches);
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  useEffect(() => {
    if (slides.length < 2 || isPaused || prefersReducedMotion) return;

    const timer = window.setInterval(() => {
      setActiveIndex((index) => (index + 1) % slides.length);
    }, 5000);

    return () => window.clearInterval(timer);
  }, [isPaused, prefersReducedMotion, slides.length]);

  function selectSlide(index: number) {
    setActiveIndex((index + slides.length) % slides.length);
  }

  function handleTouchEnd(event: React.TouchEvent<HTMLElement>) {
    const startX = touchStartX.current;
    touchStartX.current = null;
    if (startX === null) return;

    const distance = event.changedTouches[0].clientX - startX;
    if (Math.abs(distance) < 42) return;
    selectSlide(activeIndex + (distance < 0 ? 1 : -1));
  }

  function handleBuyNow() {
    if (!product?._id) return;
    addToCart({
      _id: String(product._id),
      name: getTitle(product),
      price: Number(product.price ?? 0),
      comparePrice: Number(product.comparePrice ?? 0) || undefined,
      image: getImage(product),
      inStock: product.inStock === true,
      stockQuantity: product.stockQuantity,
    }, 1);
    router.push("/checkout");
  }

  if (!activeSlide || !product) return null;

  const category = isCategorySlide ? activeSlide.category : undefined;
  const title = category ? category.name : getTitle(product);
  const description = category?.description ?? product.description?.trim() ?? "Una selección cuidada para comprar con claridad, seguridad y una experiencia simple.";
  const image = category?.image ?? getImage(product);
  const discount = category ? null : getDiscount(product);
  const savings = discount !== null && product.comparePrice ? product.comparePrice - product.price : null;
  const isOffer = !category && discount !== null;
  const slideKey = category ? `category-${category.slug}` : `product-${product._id}`;
  const productHref = `/product/${product._id}`;

  return (
    <section className="marketplace-hero-wrap border-b border-[color:var(--color-border)]" aria-label="Destacados">
      <div className="ui-shell py-3 sm:py-5 lg:py-7">
        <div
          className="marketplace-hero hero-offer-grid hero-future-surface relative isolate overflow-hidden rounded-[var(--radius-xl)] border border-white/20 px-5 py-7 shadow-[var(--shadow-strong)] sm:px-8 sm:py-10 lg:grid lg:min-h-[500px] lg:grid-cols-[minmax(0,0.95fr)_minmax(360px,0.8fr)] lg:items-center lg:gap-12 lg:px-12"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
          onFocusCapture={() => setIsPaused(true)}
          onBlurCapture={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setIsPaused(false);
          }}
          onTouchStart={(event) => { touchStartX.current = event.touches[0]?.clientX ?? null; }}
          onTouchEnd={handleTouchEnd}
        >
          <div className="marketplace-hero-sun" aria-hidden="true" />
          <div className="marketplace-hero-grid" aria-hidden="true" />
          <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-[44%] border-l border-white/15 bg-white/10 lg:block" />

          <div key={`hero-copy-${slideKey}`} className="marketplace-hero-copy hero-slide-content relative z-10 max-w-xl">
            <p className="ui-eyebrow">{category?.name ?? product.category ?? "Selección AVG"}</p>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className={isOffer ? "ui-offer-badge" : "ui-badge"}>{category ? "Categoría" : isOffer ? "Oferta disponible" : "Selección destacada"}</span>
              {discount !== null ? <span className="ui-offer-badge">{discount}% menos</span> : null}
            </div>
            <h1 className="mt-5 text-4xl font-bold leading-[0.94] tracking-[-0.055em] text-white sm:text-5xl lg:text-6xl">{title}</h1>
            <p className="mt-5 max-w-lg text-base leading-7 text-white/85 sm:text-lg">{description}</p>

            {!category ? (
              <div className="mt-7 flex flex-wrap items-end gap-x-4 gap-y-2">
                <span className="marketplace-hero-price">{formatARS(Number(product.price ?? 0))}</span>
                {product.comparePrice && product.comparePrice > product.price ? <span className="pb-1 text-sm text-[color:var(--color-text-subtle)] line-through">{formatARS(Number(product.comparePrice))}</span> : null}
                {savings ? <span className="ui-offer-badge">Ahorrás {formatARS(savings)}</span> : null}
              </div>
            ) : null}

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              {category ? <Link href={`/category/${category.slug}`} className="ui-button-primary w-full sm:w-auto">Explorar categoría</Link> : isOffer ? <Link href={productHref} className="ui-button-primary w-full sm:w-auto">Ver oferta</Link> : <button type="button" onClick={handleBuyNow} className="ui-button-primary w-full sm:w-auto">Comprar ahora</button>}
              <Link href="/#destacados" className="ui-button-secondary w-full sm:w-auto">Explorar productos</Link>
            </div>

            <div className="ui-trust-list mt-7">
              <span>Compra segura</span>
              <span>Envío con seguimiento</span>
              <span>Soporte real</span>
            </div>
          </div>

          <div key={`hero-media-${slideKey}`} className="hero-slide-content relative z-10 mt-9 lg:mt-0">
            <div className="hero-product-stage ui-product-image relative mx-auto aspect-[4/3] max-w-[510px] overflow-hidden">
              <Image src={image} alt={title} fill priority sizes="(max-width: 1024px) 100vw, 42vw" unoptimized={Boolean(category)} className="hero-product-image object-contain p-6 sm:p-8" />
              <div className="absolute left-4 top-4 rounded-full bg-[color:var(--color-surface-strong)] px-3 py-1.5 text-[0.6875rem] font-semibold uppercase tracking-[0.14em] text-[color:var(--color-text)] shadow-sm">{discount !== null ? `${discount}% OFF` : category ? "Explorar" : "Destacado"}</div>
            </div>
            <div className="mt-4 flex items-center justify-between gap-4">
              <div>
                <p className="ui-eyebrow">{category ? "Categoría seleccionada" : "Producto seleccionado"}</p>
                <h2 className="mt-1 text-lg font-semibold text-[color:var(--color-text)]">{title}</h2>
              </div>
              {slides.length > 1 ? (
                <div className="flex items-center gap-2" aria-label="Controles del carrusel">
                  <button type="button" onClick={() => selectSlide(activeIndex - 1)} className="ui-icon-button" aria-label="Anterior"><ChevronLeft className="h-4 w-4" /></button>
                  <button type="button" onClick={() => selectSlide(activeIndex + 1)} className="ui-icon-button" aria-label="Siguiente"><ChevronRight className="h-4 w-4" /></button>
                </div>
              ) : null}
            </div>
          </div>

          {slides.length > 1 ? (
            <div className="relative z-10 mt-7 flex items-center gap-2 lg:absolute lg:bottom-8 lg:left-12 lg:mt-0" aria-label="Seleccionar destacado">
              {slides.map((slide, index) => {
                const label = slide.kind === "category" ? slide.category.name : getTitle(slide.product);
                const key = slide.kind === "category" ? `category-${slide.category.slug}` : `product-${slide.product._id}`;
                return <button key={key} type="button" onClick={() => selectSlide(index)} aria-label={`Ver destacado ${index + 1}: ${label}`} aria-current={activeIndex === index} className={`h-2 rounded-full transition-all ${activeIndex === index ? "w-7 bg-[color:var(--color-accent)]" : "w-2 bg-[color:var(--color-border)] hover:bg-[color:var(--color-text-subtle)]"}`} />;
              })}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}

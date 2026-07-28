"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCart } from "@/app/context/CartContext";
import { PLACEHOLDER_IMAGE } from "@/app/constants/placeholder";
import type { Product } from "./ProductCard";

type Props = { products: Product[] };

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
  const offers = products.filter((product) => product.featured || getDiscount(product) !== null).slice(0, 5);
  const slides = offers.length > 0 ? offers : products.slice(0, 1);
  const hasOffer = offers.length > 0;
  const [activeIndex, setActiveIndex] = useState(0);
  const product = slides[activeIndex] ?? products[0];

  function selectSlide(index: number) {
    setActiveIndex((index + slides.length) % slides.length);
  }

  function handleBuyNow() {
    if (product?._id) {
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
      return;
    }
    router.push("/search?q=ofertas");
  }

  if (!product) {
    return null;
  }

  const title = getTitle(product);
  const discount = getDiscount(product);
  const category = product.category ?? "Selección AVG";

  return (
    <section className="border-b border-[color:var(--color-border)] bg-[color:var(--color-bg)]" aria-label="Ofertas destacadas">
      <div className="ui-shell py-6 sm:py-8 lg:py-10">
        <div className="hero-offer-grid relative isolate overflow-hidden rounded-[1.75rem] border border-[color:var(--color-border)] bg-[color:var(--color-surface-strong)] px-5 py-7 shadow-[var(--shadow-soft)] sm:px-8 sm:py-10 lg:grid lg:min-h-[500px] lg:grid-cols-[minmax(0,0.95fr)_minmax(360px,0.8fr)] lg:items-center lg:gap-12 lg:px-12">
          <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-[44%] border-l border-[color:var(--color-border)] bg-[color:var(--color-surface-muted)] lg:block" />

          <div className="relative z-10 max-w-xl">
            <p className="ui-eyebrow">{category}</p>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className="ui-badge">{hasOffer ? "Oferta imperdible" : "Selección destacada"}</span>
              {discount !== null ? <span className="ui-badge">{discount}% menos</span> : null}
            </div>
            <h1 className="mt-6 text-4xl font-semibold leading-[0.98] tracking-[-0.045em] text-[color:var(--color-text)] sm:text-5xl lg:text-6xl">
              Tecnología que se siente bien elegir.
            </h1>
            <p className="mt-5 max-w-lg text-base leading-7 text-[color:var(--color-text-muted)] sm:text-lg">
              {product.description?.trim() || "Una selección cuidada de productos para comprar con claridad, seguridad y una experiencia simple."}
            </p>

            <div className="mt-7 flex flex-wrap items-end gap-x-4 gap-y-2">
              <span className="text-3xl font-semibold tracking-[-0.04em] text-[color:var(--color-text)]">${Number(product.price ?? 0).toLocaleString("es-AR")}</span>
              {product.comparePrice && product.comparePrice > product.price ? <span className="pb-1 text-sm text-[color:var(--color-text-subtle)] line-through">${Number(product.comparePrice).toLocaleString("es-AR")}</span> : null}
            </div>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <button onClick={handleBuyNow} className="ui-button-primary w-full sm:w-auto">Comprar ahora</button>
              <Link href="/#destacados" className="ui-button-secondary w-full sm:w-auto">Explorar productos</Link>
            </div>

            <div className="mt-7 flex flex-wrap gap-x-5 gap-y-2 text-sm text-[color:var(--color-text-muted)]">
              <span>Compra segura</span>
              <span>•</span>
              <span>Envío con seguimiento</span>
              <span>•</span>
              <span>Soporte real</span>
            </div>
          </div>

          <div className="relative z-10 mt-9 lg:mt-0">
            <div className="relative mx-auto aspect-[4/3] max-w-[510px] overflow-hidden rounded-[1.35rem] bg-[color:var(--color-surface-muted)]">
              <Image src={getImage(product)} alt={title} fill priority sizes="(max-width: 1024px) 100vw, 42vw" className="object-contain p-6 sm:p-8" />
              <div className="absolute left-4 top-4 rounded-full bg-[color:var(--color-surface-strong)] px-3 py-1.5 text-[0.6875rem] font-semibold uppercase tracking-[0.14em] text-[color:var(--color-text)] shadow-sm">
                {discount !== null ? `${discount}% OFF` : "Destacado"}
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between gap-4">
              <div>
                <p className="ui-eyebrow">Producto seleccionado</p>
                <h2 className="mt-1 text-lg font-semibold text-[color:var(--color-text)]">{title}</h2>
              </div>
              {slides.length > 1 ? (
                <div className="flex items-center gap-2" aria-label="Controles del carrusel">
                  <button type="button" onClick={() => selectSlide(activeIndex - 1)} className="ui-icon-button" aria-label="Oferta anterior"><ChevronLeft className="h-4 w-4" /></button>
                  <button type="button" onClick={() => selectSlide(activeIndex + 1)} className="ui-icon-button" aria-label="Oferta siguiente"><ChevronRight className="h-4 w-4" /></button>
                </div>
              ) : null}
            </div>
          </div>

          {slides.length > 1 ? (
            <div className="relative z-10 mt-7 flex items-center gap-2 lg:absolute lg:bottom-8 lg:left-12 lg:mt-0" aria-label="Seleccionar oferta">
              {slides.map((slide, index) => (
                <button key={slide._id} type="button" onClick={() => selectSlide(index)} aria-label={`Ver oferta ${index + 1}: ${getTitle(slide)}`} aria-current={activeIndex === index} className={`h-2 rounded-full transition-all ${activeIndex === index ? "w-7 bg-[color:var(--color-text)]" : "w-2 bg-[color:var(--color-border)] hover:bg-[color:var(--color-text-subtle)]"}`} />
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}

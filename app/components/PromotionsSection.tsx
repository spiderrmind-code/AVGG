"use client";

import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Product } from "./ProductCard";
import { PLACEHOLDER_IMAGE } from "@/app/constants/placeholder";
import { formatARS } from "@/lib/currency";
import { getPublicOffer } from "@/lib/public-offers";

type Category = { name: string; slug: string };
type CategoryState = { products: Product[]; loading: boolean; error: boolean };
type ProductsPayload = { products?: Product[] };
const limit = 12;

function unique(products: Product[]) { return [...new Map(products.map((product) => [product._id, product])).values()]; }

function CommercialCard({ product, tone }: { product: Product; tone: "offer" | "discovery" | "category" }) {
  const title = product.title ?? product.name ?? "Producto";
  const image = product.image?.trim() || product.images?.find(Boolean) || PLACEHOLDER_IMAGE;
  const offer = getPublicOffer({ price: product.price, comparePrice: product.comparePrice, inStock: product.inStock === true });
  return <article className={`avg-commerce-card avg-commerce-card-${tone} snap-start`}>
    <Link href={`/product/${product._id}`} className="group block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-accent)]">
      <div className="relative aspect-[4/3] overflow-hidden rounded-[calc(var(--radius-lg)-0.2rem)] bg-[color:var(--color-surface-muted)]">
        <Image src={image} alt={title} fill sizes="(max-width: 639px) 78vw, (max-width: 1023px) 38vw, 260px" className="object-contain transition duration-300 group-hover:scale-[1.04]" loading="lazy" />
        {offer ? <span className="avg-commerce-badge">-{offer.discountPercent}%</span> : null}
      </div>
      <div className="p-3 sm:p-4"><p className="line-clamp-2 min-h-10 text-sm font-semibold leading-5 text-[color:var(--color-text)]">{title}</p><div className="mt-3 flex items-end gap-2"><strong className="text-xl tracking-[-0.04em] text-[color:var(--color-text)]">{formatARS(product.price)}</strong>{offer && product.comparePrice ? <span className="pb-0.5 text-xs text-[color:var(--color-text-subtle)] line-through">{formatARS(product.comparePrice)}</span> : null}</div>{offer ? <p className="mt-1 text-xs font-bold text-[color:var(--color-offer)]">Ahorrás {formatARS(offer.savings)}</p> : <p className="mt-1 text-xs font-medium text-[color:var(--color-success)]">Disponible para comprar</p>}<span className="mt-4 inline-flex min-h-9 items-center text-sm font-bold text-[color:var(--color-accent-strong)]">Ver producto <ChevronRight className="ml-1 h-4 w-4" aria-hidden="true" /></span></div>
    </Link>
  </article>;
}

function Slider({ id, products, tone, empty, loading }: { id: string; products: Product[]; tone: "offer" | "discovery" | "category"; empty: string; loading?: boolean }) {
  const viewport = useRef<HTMLDivElement>(null);
  const move = (direction: number) => viewport.current?.scrollBy({ left: direction * Math.max(260, viewport.current.clientWidth * 0.75), behavior: "smooth" });
  if (loading) return <div className="avg-commerce-skeletons" aria-busy="true"><span /><span /><span /></div>;
  if (!products.length) return <p className="avg-commerce-empty">{empty}</p>;
  return <div className="relative"><div ref={viewport} id={id} className="avg-commerce-slider" tabIndex={0}>{products.map((product) => <CommercialCard key={product._id} product={product} tone={tone} />)}</div><div className="avg-commerce-arrows" aria-label="Controles del carrusel"><button type="button" aria-label="Ver productos anteriores" onClick={() => move(-1)}><ChevronLeft aria-hidden="true" /></button><button type="button" aria-label="Ver más productos" onClick={() => move(1)}><ChevronRight aria-hidden="true" /></button></div></div>;
}

export default function PromotionsSection({ products, categories }: { products: Product[]; categories: Category[] }) {
  const offers = products.filter((product) => getPublicOffer({ price: product.price, comparePrice: product.comparePrice, inStock: product.inStock === true }) !== null).slice(0, limit);
  const featured = unique(products.filter((product) => product.featured && product.inStock === true).concat(products.filter((product) => product.inStock === true))).filter((product) => !offers.some((offer) => offer._id === product._id)).slice(0, limit);
  const discovery = unique(products.filter((product) => product.inStock === true).filter((product) => !offers.some((offer) => offer._id === product._id) && !featured.some((item) => item._id === product._id))).slice(0, limit);
  const visibleCategories = categories.filter((category) => category.slug).slice(0, 8);
  const [activeCategory, setActiveCategory] = useState(visibleCategories[0]?.slug ?? "");
  const [byCategory, setByCategory] = useState<Record<string, CategoryState>>({});
  const requestRef = useRef<AbortController | null>(null);
  const loadCategory = useCallback(async (slug: string, retry = false) => {
    if (!slug || (byCategory[slug] && !retry)) return;
    requestRef.current?.abort(); const controller = new AbortController(); requestRef.current = controller;
    setByCategory((all) => ({ ...all, [slug]: { products: all[slug]?.products ?? [], loading: true, error: false } }));
    try { const response = await fetch(`/api/products?category=${encodeURIComponent(slug)}&page=1&limit=${limit}`, { signal: controller.signal }); if (!response.ok) throw new Error("catalog_error"); const payload: unknown = await response.json(); if (controller.signal.aborted || !payload || typeof payload !== "object") return; const items = Array.isArray((payload as ProductsPayload).products) ? (payload as ProductsPayload).products ?? [] : []; setByCategory((all) => ({ ...all, [slug]: { products: unique(items), loading: false, error: false } })); } catch { if (!controller.signal.aborted) setByCategory((all) => ({ ...all, [slug]: { products: all[slug]?.products ?? [], loading: false, error: true } })); }
  }, [byCategory]);
  useEffect(() => () => requestRef.current?.abort(), []);
  const categoryState = byCategory[activeCategory];
  const selectCategory = (slug: string) => { setActiveCategory(slug); void loadCategory(slug); };
  const maxDiscount = offers.reduce((max, product) => Math.max(max, getPublicOffer({ price: product.price, comparePrice: product.comparePrice, inStock: product.inStock === true })?.discountPercent ?? 0), 0);

  return <section id="ofertas" className="avg-commerce ui-shell ui-section" aria-label="Descubrimiento y ofertas">
    {offers.length ? <div className="avg-commerce-feature avg-commerce-offers"><div className="avg-commerce-heading"><div><p className="section-label text-[color:var(--color-offer)]">Oportunidades verificadas</p><h2>Ofertas que se explican solas</h2><p>Descuentos reales, precios claros y productos disponibles.</p></div><div className="flex items-center gap-3"><a href="#ofertas" className="ui-button-secondary">Ver ofertas</a><span className="avg-commerce-highlight">Hasta {maxDiscount}% OFF</span></div></div><Slider id="offers-slider" products={offers} tone="offer" empty="No hay ofertas verificables en este momento." /></div> : null}
    <div className="avg-commerce-feature avg-commerce-discovery"><div className="avg-commerce-heading"><div><p className="section-label text-[color:var(--color-accent-strong)]">Selección AVG</p><h2>Para descubrir ahora</h2><p>Productos destacados y disponibles del catálogo actual.</p></div><Sparkles className="h-8 w-8 text-[color:var(--color-accent)]" aria-hidden="true" /></div><Slider id="featured-slider" products={featured} tone="discovery" empty="No hay productos destacados disponibles." /></div>
    {visibleCategories.length ? <div className="avg-commerce-feature avg-commerce-categories"><div className="avg-commerce-heading"><div><p className="section-label text-[color:var(--color-success)]">Explorá por colección</p><h2>Encontrá tu próxima elección</h2><p>Cada colección se carga sólo cuando decidís recorrerla.</p></div></div><div className="avg-commerce-tabs" role="tablist" aria-label="Categorías de productos">{visibleCategories.map((category) => <button key={category.slug} type="button" role="tab" aria-selected={activeCategory === category.slug} onClick={() => selectCategory(category.slug)} className={activeCategory === category.slug ? "is-active" : ""}>{category.name}</button>)}</div><div className="mt-5" role="tabpanel" aria-busy={categoryState?.loading ?? false}>{categoryState?.error ? <div className="avg-commerce-empty">No pudimos cargar esta colección.<button type="button" className="ui-button-secondary ml-3" onClick={() => void loadCategory(activeCategory, true)}>Reintentar</button></div> : <Slider id="category-slider" products={categoryState?.products ?? []} tone="category" loading={categoryState?.loading} empty="Elegí una colección para ver productos disponibles." />}</div></div> : null}
    {discovery.length ? <div className="avg-commerce-feature avg-commerce-continuous"><div className="avg-commerce-heading"><div><p className="section-label">Seguí explorando</p><h2>Más para vos, sin repetir lo mismo</h2><p>Una selección adicional de productos disponibles.</p></div><Link href="/#destacados" className="ui-button-secondary">Ver catálogo</Link></div><Slider id="continuous-slider" products={discovery} tone="discovery" empty="No hay más productos para explorar." /></div> : null}
  </section>;
}

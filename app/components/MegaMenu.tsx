"use client";

import Image from "next/image";
import Link from "next/link";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ChevronRight, Loader2 } from "lucide-react";
import { formatARS } from "@/lib/currency";

export interface Category {
  _id?: string;
  name: string;
  slug: string;
  image?: string;
  children?: { name: string; slug: string }[];
}

export type MegaMenuProduct = {
  _id: string;
  name: string;
  image?: string;
  images: string[];
  price: number;
  comparePrice?: number;
  inStock: boolean;
};

export type CategoryPage = {
  products: MegaMenuProduct[];
  page: number;
  hasMore: boolean;
  loading: boolean;
  error: "initial" | "more" | null;
};

type ProductResponse = {
  products?: MegaMenuProduct[];
  hasMore?: boolean;
};

interface Props {
  categories: Category[];
  open?: boolean;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  onClose?: () => void;
  variant?: "desktop" | "mobile";
}

const PAGE_SIZE = 12;

function imageOf(product: MegaMenuProduct) {
  return product.image?.trim() || product.images.find(Boolean);
}

function isProduct(value: unknown): value is MegaMenuProduct {
  if (!value || typeof value !== "object") return false;
  const product = value as Partial<MegaMenuProduct>;
  return typeof product._id === "string" && typeof product.name === "string" && typeof product.price === "number";
}

export function dedupeMegaMenuProducts(products: MegaMenuProduct[]) {
  return [...new Map(products.map((product) => [product._id, product])).values()];
}

export function resetAbortedMegaMenuPages(pages: Record<string, CategoryPage>) {
  return Object.fromEntries(
    Object.entries(pages).map(([slug, page]) => [slug, page.loading ? { ...page, loading: false } : page]),
  );
}

export function shouldLoadMegaMenuCategory(page: CategoryPage | undefined, hasPendingRequest = false) {
  return !page || (!hasPendingRequest && page.products.length === 0 && page.page === 0 && page.error === null);
}

function LoadingState({ label = "Cargando productos…" }: { label?: string }) {
  return <div className="flex min-h-32 items-center justify-center gap-2 text-sm text-[color:var(--color-text-muted)]"><Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />{label}</div>;
}

function ProductGrid({ products, onNavigate, columns }: { products: MegaMenuProduct[]; onNavigate?: () => void; columns: "desktop" | "mobile" }) {
  return <div className={`grid gap-3 ${columns === "mobile" ? "grid-cols-2" : "grid-cols-3 xl:grid-cols-4"}`}>
    {products.map((product) => {
      const image = imageOf(product);
      return <Link key={product._id} href={`/product/${product._id}`} onClick={onNavigate} className="group min-w-0 rounded-[var(--radius-md)] border border-[color:var(--color-border)] bg-[color:var(--color-surface-strong)] p-2 transition hover:-translate-y-0.5 hover:border-[color:var(--color-accent)] hover:shadow-[var(--shadow-sm)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-accent)]">
        <div className="relative aspect-square overflow-hidden rounded-[calc(var(--radius-md)-0.25rem)] bg-[color:var(--color-surface-muted)]">
          {image ? <Image src={image} alt={product.name} fill sizes={columns === "mobile" ? "(max-width: 767px) 40vw" : "(min-width: 1280px) 180px, 150px"} className="object-contain transition duration-200 group-hover:scale-[1.03]" /> : <span className="flex h-full items-center justify-center px-3 text-center text-xs text-[color:var(--color-text-subtle)]">Imagen no disponible</span>}
        </div>
        <p className="mt-2 line-clamp-2 min-h-9 text-xs font-semibold leading-4 text-[color:var(--color-text)]">{product.name}</p>
        <p className="mt-1 text-sm font-bold text-[color:var(--color-accent-strong)]">{formatARS(product.price)}</p>
      </Link>;
    })}
  </div>;
}

const MegaMenu = React.forwardRef<HTMLDivElement, Props>(function MegaMenu({ categories, open = false, onMouseEnter, onMouseLeave, onClose, variant = "desktop" }, ref) {
  const [activeSlug, setActiveSlug] = useState<string | null>(null);
  const [pages, setPages] = useState<Record<string, CategoryPage>>({});
  const [mobileProductsOpen, setMobileProductsOpen] = useState(false);
  const pagesRef = useRef(pages);
  const controllerRef = useRef<AbortController | null>(null);
  const inFlightRef = useRef(new Map<string, number>());
  const requestVersionRef = useRef(0);

  useEffect(() => { pagesRef.current = pages; }, [pages]);

  const active = useMemo(() => categories.find((category) => category.slug === activeSlug) ?? categories[0], [activeSlug, categories]);
  const state = active ? pages[active.slug] : undefined;

  const abortRequest = useCallback(() => {
    requestVersionRef.current += 1;
    controllerRef.current?.abort();
    controllerRef.current = null;
    inFlightRef.current.clear();
  }, []);

  const cancelRequest = useCallback((resetLoading = false) => {
    abortRequest();
    if (resetLoading) setPages(resetAbortedMegaMenuPages);
  }, [abortRequest]);

  const load = useCallback(async (slug: string, page: number, retry = false) => {
    const requestKey = `${slug}:${page}`;
    const current = pagesRef.current[slug];
    if (inFlightRef.current.has(requestKey) || (page > 1 && !current?.hasMore)) return;

    cancelRequest(true);
    const version = requestVersionRef.current;
    const controller = new AbortController();
    controllerRef.current = controller;
    inFlightRef.current.set(requestKey, version);
    setPages((all) => ({
      ...all,
      [slug]: {
        products: page === 1 ? (retry ? all[slug]?.products ?? [] : []) : all[slug]?.products ?? [],
        page: page === 1 ? 0 : all[slug]?.page ?? 0,
        hasMore: all[slug]?.hasMore ?? true,
        loading: true,
        error: null,
      },
    }));

    try {
      const response = await fetch(`/api/products?category=${encodeURIComponent(slug)}&limit=${PAGE_SIZE}&page=${page}`, { signal: controller.signal });
      if (!response.ok) throw new Error("catalog_error");
      const payload: unknown = await response.json();
      if (controller.signal.aborted || requestVersionRef.current !== version || !payload || typeof payload !== "object") return;
      const responsePayload = payload as ProductResponse;
      const received = Array.isArray(responsePayload.products) ? responsePayload.products.filter(isProduct) : [];
      setPages((all) => {
        const prior = page === 1 ? [] : all[slug]?.products ?? [];
        return {
          ...all,
          [slug]: { products: dedupeMegaMenuProducts([...prior, ...received]), page, hasMore: responsePayload.hasMore === true, loading: false, error: null },
        };
      });
    } catch {
      if (!controller.signal.aborted && requestVersionRef.current === version) {
        setPages((all) => ({
          ...all,
          [slug]: { ...(all[slug] ?? { products: [], page: 0, hasMore: true }), loading: false, error: page === 1 ? "initial" : "more" },
        }));
      }
    } finally {
      if (inFlightRef.current.get(requestKey) === version) inFlightRef.current.delete(requestKey);
    }
  }, [cancelRequest]);

  const selectCategory = useCallback((slug: string, openProducts = variant === "mobile") => {
    const selectedSlug = activeSlug ?? categories[0]?.slug ?? null;
    if (slug !== selectedSlug) cancelRequest(true);
    setActiveSlug(slug);
    if (variant === "mobile") setMobileProductsOpen(openProducts);
  }, [activeSlug, cancelRequest, categories, variant]);

  useEffect(() => {
    if (!open) {
      abortRequest();
    }
  }, [abortRequest, open]);

  useEffect(() => {
    const page = active ? pagesRef.current[active.slug] : undefined;
    const hasPendingRequest = active ? inFlightRef.current.has(`${active.slug}:${page?.page ? page.page + 1 : 1}`) : false;
    const shouldLoad = open && active && (variant === "desktop" || mobileProductsOpen) && shouldLoadMegaMenuCategory(page, hasPendingRequest);
    if (shouldLoad) void load(active.slug, 1);
  }, [active, load, mobileProductsOpen, open, variant]);

  useEffect(() => () => abortRequest(), [abortRequest]);

  if (!open || categories.length === 0) return null;

  const loadNext = () => {
    if (active && state && state.hasMore && !state.loading) void load(active.slug, state.page + 1);
  };
  const onScroll = (event: React.UIEvent<HTMLDivElement>) => {
    const node = event.currentTarget;
    if (node.scrollHeight - node.scrollTop - node.clientHeight < 120) loadNext();
  };
  const retry = () => active && void load(active.slug, state?.error === "more" ? Math.max(1, (state?.page ?? 0) + 1) : 1, true);
  const renderResults = (columns: "desktop" | "mobile") => <>
    {state?.loading && state.products.length === 0 ? <LoadingState /> : null}
    {state?.error === "initial" && state.products.length === 0 ? <div className="py-8 text-center"><p className="text-sm text-[color:var(--color-text-muted)]">No pudimos cargar los productos.</p><button type="button" className="ui-button-secondary mt-3" onClick={retry}>Reintentar</button></div> : null}
    {state && state.products.length > 0 ? <ProductGrid products={state.products} columns={columns} onNavigate={variant === "mobile" ? onClose : undefined} /> : null}
    {!state?.loading && !state?.error && state?.products.length === 0 ? <p className="py-8 text-center text-sm text-[color:var(--color-text-muted)]">No hay productos disponibles.</p> : null}
    {state?.error === "more" ? <div className="mt-4 text-center"><p className="text-sm text-[color:var(--color-text-muted)]">No se pudieron cargar más productos.</p><button type="button" className="ui-button-secondary mt-2" onClick={retry}>Reintentar</button></div> : null}
    {state?.loading && state.products.length > 0 ? <LoadingState label="Cargando más productos…" /> : null}
    {state && !state.loading && !state.hasMore && state.products.length > 0 ? <p className="py-4 text-center text-xs text-[color:var(--color-text-muted)]">Fin de productos</p> : null}
  </>;

  if (variant === "mobile") {
    return <section aria-label="Colecciones" className="min-h-0">
      {!mobileProductsOpen ? <div className="flex max-h-[calc(100dvh-13rem)] flex-col gap-2 overflow-y-auto pr-1" role="list">
        {categories.map((category) => <div key={category.slug} role="listitem"><button type="button" onClick={() => selectCategory(category.slug, true)} className="flex min-h-12 w-full items-center justify-between rounded-[var(--radius-md)] border border-[color:var(--color-border)] bg-[color:var(--color-surface-strong)] px-3 text-left text-sm font-semibold text-[color:var(--color-text)] transition hover:bg-[color:var(--color-accent-soft)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-accent)]"><span>{category.name}</span><ChevronRight className="h-4 w-4 text-[color:var(--color-text-subtle)]" aria-hidden="true" /></button></div>)}
      </div> : <div className="min-h-0">
        <div className="mb-3 flex items-center justify-between gap-3"><button type="button" onClick={() => setMobileProductsOpen(false)} className="ui-button-secondary inline-flex items-center gap-1.5" aria-label="Volver a categorías"><ArrowLeft className="h-4 w-4" aria-hidden="true" />Volver a categorías</button>{active ? <Link href={`/category/${active.slug}`} onClick={onClose} className="text-sm font-semibold text-[color:var(--color-accent-strong)]">Ver todos</Link> : null}</div>
        <h2 className="mb-3 text-base font-semibold text-[color:var(--color-text)]">{active?.name}</h2>
        <div className="max-h-[calc(100dvh-18rem)] overflow-y-auto overscroll-contain pr-1" aria-busy={state?.loading ?? false} onScroll={onScroll}>{renderResults("mobile")}</div>
      </div>}
    </section>;
  }

  return <div ref={ref} id="mega-menu" onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave} onKeyDown={(event) => { if (event.key === "Escape") onClose?.(); }} className="ui-popover absolute left-0 top-full z-[999] mt-4 hidden w-[min(94vw,1100px)] overflow-hidden md:grid md:grid-cols-[230px_minmax(0,1fr)]" aria-label="Categorías">
    <div className="max-h-[min(70vh,640px)] overflow-y-auto border-r border-[color:var(--color-border)] p-3" role="tablist" aria-label="Categorías del catálogo">
      {categories.map((category) => <button key={category.slug} type="button" role="tab" aria-selected={active?.slug === category.slug} aria-controls="mega-menu-products" onMouseEnter={() => selectCategory(category.slug, false)} onFocus={() => selectCategory(category.slug, false)} onClick={() => selectCategory(category.slug, false)} className={`flex min-h-11 w-full items-center rounded-[var(--radius-md)] px-3 text-left text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-accent)] ${active?.slug === category.slug ? "bg-[color:var(--color-accent-soft)] text-[color:var(--color-accent-strong)]" : "text-[color:var(--color-text)] hover:bg-[color:var(--color-surface-muted)]"}`}>{category.name}</button>)}
    </div>
    {active ? <div id="mega-menu-products" role="tabpanel" tabIndex={0} className="max-h-[min(70vh,640px)] min-w-0 overflow-y-auto overscroll-contain p-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[color:var(--color-accent)]" aria-busy={state?.loading ?? false} onScroll={onScroll}>
      <div className="sticky top-0 z-10 mb-4 flex items-center justify-between gap-3 bg-[color:var(--color-surface-strong)] pb-3"><div><h2 className="font-semibold text-[color:var(--color-text)]">{active.name}</h2><span className="sr-only" aria-live="polite">Categoría activa: {active.name}</span></div><Link href={`/category/${active.slug}`} className="ui-button-primary shrink-0">Ver todos</Link></div>
      {renderResults("desktop")}
    </div> : null}
  </div>;
});

MegaMenu.displayName = "MegaMenu";
export default MegaMenu;

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { normalizeCatalogSlug, type PublicProduct } from "@/lib/catalog";

export interface Category {
  _id?: string;
  name: string;
  slug: string;
  image?: string;
  children?: {
    name: string;
    slug: string;
  }[];
}

export type MegaMenuProduct = Pick<PublicProduct, "_id" | "name" | "image" | "images" | "category" | "categorySlug" | "featured" | "inStock">;

interface MegaMenuProps {
  categories: Category[];
  products?: MegaMenuProduct[];
  open?: boolean;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  onClose?: () => void;
}

function getPreviewImage(category: Category) {
  const categoryImage = category.image?.trim();
  return categoryImage && !categoryImage.startsWith("data:image/svg+xml") ? categoryImage : undefined;
}

function getProductImage(product: MegaMenuProduct) {
  return product.image?.trim() || product.images.find((image) => image.trim());
}

function getPreviewProduct(category: Category, products: MegaMenuProduct[]) {
  const categorySlug = normalizeCatalogSlug(category.slug);
  const categoryNameSlug = normalizeCatalogSlug(category.name);
  return products
    .filter((product) => product.inStock && Boolean(getProductImage(product)))
    .filter((product) => product.categorySlug === categorySlug || normalizeCatalogSlug(product.category) === categoryNameSlug)
    .sort((left, right) => Number(right.featured) - Number(left.featured))[0];
}

const MegaMenu = React.forwardRef<HTMLDivElement, MegaMenuProps>(
  ({ categories, products = [], open = false, onMouseEnter, onMouseLeave }, ref) => {
    const [activeSlug, setActiveSlug] = useState<string | null>(null);
    const activeCategory = categories.find((category) => category.slug === activeSlug) ?? categories[0];
    const previewProduct = activeCategory ? getPreviewProduct(activeCategory, products) : undefined;
    const previewImage = previewProduct ? getProductImage(previewProduct) : activeCategory ? getPreviewImage(activeCategory) : undefined;
    const previewInitial = activeCategory?.name.trim().charAt(0).toUpperCase() ?? "C";

    if (!open) return null;

    function activateByOffset(currentIndex: number, offset: number) {
      const next = categories[(currentIndex + offset + categories.length) % categories.length];
      if (next) setActiveSlug(next.slug);
    }

    return (
      <div
        ref={ref}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        className="ui-popover absolute left-0 top-full z-[999] mt-4 hidden w-[min(92vw,940px)] max-w-[940px] overflow-hidden md:grid md:grid-cols-[minmax(220px,0.76fr)_minmax(0,1.24fr)]"
        aria-label="Categorías"
      >
        {categories.length === 0 ? (
          <div className="p-6 text-sm text-[color:var(--color-text-muted)]">No hay categorías disponibles</div>
        ) : (
          <>
            <div className="border-r border-[color:var(--color-border)] bg-[color:var(--color-surface-muted)] p-3" role="tablist" aria-label="Categorías principales">
              <p className="px-3 pb-2 pt-1 text-[0.6875rem] font-bold uppercase tracking-[0.18em] text-[color:var(--color-text-subtle)]">Explorar</p>
              <div className="max-h-[360px] space-y-1 overflow-y-auto pr-1">
                {categories.map((category, index) => {
                  const isActive = activeCategory?.slug === category.slug;
                  return (
                    <button
                      key={category._id ?? category.slug}
                      type="button"
                      role="tab"
                      aria-selected={isActive}
                      onMouseEnter={() => setActiveSlug(category.slug)}
                      onFocus={() => setActiveSlug(category.slug)}
                      onClick={() => setActiveSlug(category.slug)}
                      onKeyDown={(event) => {
                        if (event.key === "ArrowDown" || event.key === "ArrowRight") {
                          event.preventDefault();
                          activateByOffset(index, 1);
                        }
                        if (event.key === "ArrowUp" || event.key === "ArrowLeft") {
                          event.preventDefault();
                          activateByOffset(index, -1);
                        }
                      }}
                      className={`flex min-h-11 w-full items-center justify-between rounded-[var(--radius-md)] px-3 text-left text-sm font-semibold transition ${isActive ? "bg-[color:var(--color-surface-strong)] text-[color:var(--color-accent-strong)] shadow-sm" : "text-[color:var(--color-text-muted)] hover:bg-[color:var(--color-surface-strong)] hover:text-[color:var(--color-text)]"}`}
                    >
                      {category.name}
                      <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${isActive ? "bg-[color:var(--color-accent)]" : "bg-transparent"}`} />
                    </button>
                  );
                })}
              </div>
            </div>

            {activeCategory ? (
              <div className="grid min-h-[360px] grid-cols-[minmax(0,1fr)_minmax(150px,.72fr)] gap-6 p-6" role="tabpanel">
                <div>
                  <p className="ui-eyebrow">Colección</p>
                  <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[color:var(--color-text)]">{activeCategory.name}</h2>
                  <Link href={`/category/${activeCategory.slug}`} className="ui-button-primary mt-5">Ver categoría</Link>

                  {activeCategory.children && activeCategory.children.length > 0 ? (
                    <div className="mt-7 border-t border-[color:var(--color-border)] pt-5">
                      <p className="text-[0.6875rem] font-bold uppercase tracking-[0.16em] text-[color:var(--color-text-subtle)]">Subcategorías</p>
                      <div className="mt-3 grid gap-1 sm:grid-cols-2">
                        {activeCategory.children.map((child) => (
                          <Link key={child.slug} href={`/category/${child.slug}`} className="rounded-[var(--radius-sm)] px-3 py-2 text-sm font-medium text-[color:var(--color-text-muted)] transition hover:bg-[color:var(--color-accent-soft)] hover:text-[color:var(--color-accent-strong)]">
                            {child.name}
                          </Link>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>

                <div className="mega-preview-stage">
                <Link key={previewProduct?._id ?? activeCategory.slug} href={previewProduct ? `/product/${previewProduct._id}` : `/category/${activeCategory.slug}`} className="mega-preview-card group relative block min-h-48 overflow-hidden rounded-[var(--radius-lg)] border border-[color:var(--color-border)] bg-[color:var(--color-accent-soft)]">
                  {previewImage ? (
                    <Image src={previewImage} alt={previewProduct ? previewProduct.name : `Vista previa de ${activeCategory.name}`} fill sizes="180px" unoptimized className="mega-preview-image object-contain p-3" />
                  ) : (
                    <div className="mega-preview-fallback" aria-label={`Vista previa de ${activeCategory.name}`}>
                      <span aria-hidden="true" className="mega-preview-initial">{previewInitial}</span>
                      <span className="text-sm font-semibold">Próximamente</span>
                      <span className="text-xs text-[color:var(--color-text-muted)]">{activeCategory.name}</span>
                    </div>
                  )}
                  <span className="absolute inset-x-0 bottom-0 z-10 bg-[linear-gradient(transparent,rgba(15,23,42,.68))] px-4 pb-4 pt-12 text-sm font-semibold text-white">{previewProduct?.name ?? "Explorar"}</span>
                </Link>
                </div>
              </div>
            ) : null}
          </>
        )}
      </div>
    );
  },
);

MegaMenu.displayName = "MegaMenu";

export default MegaMenu;

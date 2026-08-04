"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/app/context/CartContext";
import type { ProductDocument } from "@/types/ecommerce";
import { PLACEHOLDER_IMAGE } from "@/app/constants/placeholder";

interface ProductDetailsProps {
  product: ProductDocument;
  relatedProducts: ProductDocument[];
}

export default function ProductDetails({ product, relatedProducts }: ProductDetailsProps) {
  const router = useRouter();
  const { addToCart } = useCart();
  const [selectedImage, setSelectedImage] = useState(product.image ?? product.images?.[0] ?? PLACEHOLDER_IMAGE);

  const images = [product.image, ...(product.images ?? [])].filter(Boolean) as string[];
  const discount = product.comparePrice && product.comparePrice > product.price
    ? Math.round(((product.comparePrice - product.price) / product.comparePrice) * 100)
    : 0;

  const title = product.title ?? product.name ?? "Producto";

  const handleAddToCart = () => {
    addToCart(
      {
        _id: String(product._id),
        name: title,
        price: product.price,
        comparePrice: product.comparePrice,
        image: product.image ?? PLACEHOLDER_IMAGE,
        inStock: product.stock === true,
      },
      1
    );
  };

  const handleBuyNow = () => {
    handleAddToCart();
    router.push("/checkout");
  };

  return (
    <main className="ui-page bg-transparent">
      <div className="mx-auto max-w-7xl">
        <Link href="/" className="ui-button-secondary mb-8 w-fit">
          ← Volver a la tienda
        </Link>

        <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr]">
          <section className="ui-surface p-4 sm:p-6">
            <div className="ui-product-image relative aspect-[4/4.1] overflow-hidden">
              <Image src={selectedImage} alt={title} fill className="object-contain" />
            </div>
            {images.length > 1 ? (
              <div className="mt-4 grid grid-cols-4 gap-3">
                {images.map((image, index) => (
                  <button key={`${image}-${index}`} type="button" aria-label={`Ver imagen ${index + 1} de ${title}`} aria-pressed={selectedImage === image} onClick={() => setSelectedImage(image)} className={`relative aspect-square overflow-hidden rounded-[var(--radius-md)] border transition ${selectedImage === image ? "border-[color:var(--color-accent)] shadow-sm" : "border-[color:var(--color-border)] hover:border-[color:var(--color-accent)]"}`}>
                    <Image src={image} alt={`${title}-${index + 1}`} fill className="object-cover" />
                  </button>
                ))}
              </div>
            ) : null}
          </section>

          <section className="ui-surface flex flex-col justify-center p-6 sm:p-8">
            <span className="ui-badge w-fit">
              {product.category ?? "Producto"}
            </span>
            <h1 className="mt-4 text-3xl font-semibold tracking-[-0.02em] text-neutral-950 sm:text-4xl">{title}</h1>
            <p className="mt-4 text-base leading-7 text-neutral-600 dark:text-zinc-300">{product.description ?? "Producto seleccionado para aportar valor real, diseño premium y una experiencia de compra más confiable."}</p>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              {product.comparePrice && product.comparePrice > product.price ? (
                <>
                  <span className="text-lg text-neutral-400 line-through">${product.comparePrice}</span>
                  <span className="ui-offer-badge">-{discount}%</span>
                </>
              ) : null}
              <p className="text-4xl font-semibold tracking-[-0.02em] text-neutral-950">${product.price}</p>
            </div>

            <div className="ui-subtle-panel mt-6 grid gap-3 p-4 text-sm text-[color:var(--color-text-muted)]">
              <div className="flex items-center justify-between"><span>Stock</span><span className="font-semibold text-neutral-950">{product.stock === false ? "Agotado" : "Disponible"}</span></div>
              <div className="flex items-center justify-between"><span>Envío</span><span className="font-semibold text-neutral-950">{product.shippingDays ?? "24-48 hs"}</span></div>
              <div className="flex items-center justify-between"><span>Categoría</span><span className="font-semibold text-neutral-950">{product.category ?? "General"}</span></div>
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <button type="button" onClick={handleAddToCart} className="ui-button-primary min-h-[3.25rem] flex-1 px-5">Agregar al carrito</button>
              <button type="button" onClick={handleBuyNow} className="ui-button-secondary min-h-[3.25rem] flex-1 px-5">Comprar ahora</button>
            </div>

            <div className="ui-subtle-panel mt-8 p-5 text-sm text-[color:var(--color-text-muted)]">
              <h2 className="font-semibold text-neutral-950">Por qué comprar en AVG Connects</h2>
              <ul className="mt-3 space-y-2">
                <li>• Envíos con seguimiento y procesos claros.</li>
                <li>• Productos seleccionados para ofrecer valor real y confianza.</li>
                <li>• Checkout simple, seguro y pensado para vender sin fricción.</li>
              </ul>
            </div>
          </section>
        </div>

        <section className="mt-12">
          <h2 className="text-2xl font-semibold tracking-[-0.02em] text-neutral-950">Productos relacionados</h2>
          <div className="mt-6 grid gap-6 md:grid-cols-3">
            {relatedProducts.slice(0, 3).map((item) => {
              const image = item.image ?? item.images?.[0] ?? PLACEHOLDER_IMAGE;
              const relatedTitle = item.title ?? item.name ?? "Producto";
              return (
                <Link key={String(item._id)} href={`/product/${item._id}`} className="ui-card ui-card-hover p-4">
                  <div className="ui-product-image relative aspect-square overflow-hidden">
                    <Image src={image} alt={relatedTitle} fill className="object-cover" />
                  </div>
                  <h3 className="mt-4 font-semibold text-neutral-950">{relatedTitle}</h3>
                  <p className="mt-2 text-sm text-neutral-600">{item.category ?? "Producto premium"}</p>
                  <p className="mt-3 font-semibold text-neutral-950">${item.price}</p>
                </Link>
              );
            })}
          </div>
        </section>
      </div>
    </main>
  );
}

"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { useCart } from "@/app/context/CartContext";
import type { ProductDocument } from "@/types/ecommerce";
import { PLACEHOLDER_IMAGE } from "@/app/constants/placeholder";

interface ProductDetailsProps {
  product: ProductDocument;
  relatedProducts: ProductDocument[];
}

export default function ProductDetails({ product, relatedProducts }: ProductDetailsProps) {
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
        comparePrice: product.comparePrice ?? (product as any).oldPrice,
        image: product.image ?? PLACEHOLDER_IMAGE,
      },
      1
    );
  };

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(0,0,0,0.03),_transparent_45%)] px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <Link href="/" className="mb-8 inline-flex items-center text-sm font-medium text-neutral-700 transition hover:text-neutral-950">
          ← Volver a la tienda
        </Link>

        <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr]">
          <section className="rounded-[2rem] border border-white/70 bg-white/70 p-4 shadow-[0_20px_80px_rgba(0,0,0,0.06)] backdrop-blur-xl sm:p-6">
            <div className="relative aspect-[4/4.1] overflow-hidden rounded-[1.5rem] bg-neutral-100">
              <Image src={selectedImage} alt={title} fill className="object-contain" />
            </div>
            {images.length > 1 ? (
              <div className="mt-4 grid grid-cols-4 gap-3">
                {images.map((image, index) => (
                  <button key={`${image}-${index}`} onClick={() => setSelectedImage(image)} className={`relative aspect-square overflow-hidden rounded-2xl border transition ${selectedImage === image ? "border-neutral-950 shadow-sm" : "border-neutral-200 hover:border-neutral-300"}`}>
                    <Image src={image} alt={`${title}-${index + 1}`} fill className="object-cover" />
                  </button>
                ))}
              </div>
            ) : null}
          </section>

          <section className="flex flex-col justify-center rounded-[2rem] border border-white/70 bg-white/80 p-6 shadow-[0_20px_80px_rgba(0,0,0,0.06)] backdrop-blur-xl sm:p-8">
            <span className="inline-flex w-fit rounded-full border border-neutral-200 bg-neutral-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-neutral-600">
              {product.category ?? "Producto"}
            </span>
            <h1 className="mt-4 text-3xl font-semibold tracking-[-0.02em] text-neutral-950 sm:text-4xl">{title}</h1>
            <p className="mt-4 text-base leading-7 text-neutral-600">{product.description ?? "Producto seleccionado para aportar valor real, diseño premium y una experiencia de compra más confiable."}</p>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              {product.comparePrice && product.comparePrice > product.price ? (
                <>
                  <span className="text-lg text-neutral-400 line-through">${product.comparePrice}</span>
                  <span className="rounded-full bg-rose-50 px-3 py-1 text-sm font-semibold text-rose-600">-{discount}%</span>
                </>
              ) : null}
              <p className="text-4xl font-semibold tracking-[-0.02em] text-neutral-950">${product.price}</p>
            </div>

            <div className="mt-6 grid gap-3 rounded-[1.5rem] border border-neutral-200 bg-white/90 p-4 text-sm text-neutral-600">
              <div className="flex items-center justify-between"><span>Stock</span><span className="font-semibold text-neutral-950">{product.stock === false ? "Agotado" : "Disponible"}</span></div>
              <div className="flex items-center justify-between"><span>Envío</span><span className="font-semibold text-neutral-950">{product.shippingDays ?? "24-48 hs"}</span></div>
              <div className="flex items-center justify-between"><span>Categoría</span><span className="font-semibold text-neutral-950">{product.category ?? "General"}</span></div>
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <button onClick={handleAddToCart} className="flex-1 rounded-full bg-neutral-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-neutral-800">Agregar al carrito</button>
              <Link href="/checkout" className="flex-1 rounded-full border border-neutral-300 px-5 py-3 text-center text-sm font-semibold text-neutral-900 transition hover:border-neutral-400">Comprar ahora</Link>
            </div>

            <div className="mt-8 rounded-[1.5rem] border border-neutral-200 bg-white/90 p-5 text-sm text-neutral-600">
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
                <Link key={String(item._id)} href={`/product/${item._id}`} className="rounded-[1.5rem] border border-white/70 bg-white/80 p-4 shadow-[0_16px_50px_rgba(0,0,0,0.05)] transition hover:-translate-y-1">
                  <div className="relative aspect-square overflow-hidden rounded-[1.2rem] bg-neutral-100">
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

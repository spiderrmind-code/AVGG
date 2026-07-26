"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { useCart } from "@/app/context/CartContext";
import type { ProductDocument } from "@/types/ecommerce";

interface ProductDetailsProps {
  product: ProductDocument;
  relatedProducts: ProductDocument[];
}

export default function ProductDetails({ product, relatedProducts }: ProductDetailsProps) {
  const { addToCart } = useCart();
  const [selectedImage, setSelectedImage] = useState(product.image ?? product.images?.[0] ?? "/placeholder-product.png");

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
        image: product.image ?? "/placeholder-product.png",
      },
      1
    );
  };

  return (
    <main className="min-h-screen bg-neutral-50 px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <Link href="/" className="mb-8 inline-flex items-center text-sm font-medium text-neutral-700 hover:text-black">
          ← Volver a la tienda
        </Link>

        <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr]">
          <section className="rounded-3xl border border-neutral-200 bg-white p-4 shadow-sm sm:p-6">
            <div className="relative aspect-[4/4.2] overflow-hidden rounded-2xl bg-neutral-100">
              <Image src={selectedImage} alt={title} fill className="object-contain" />
            </div>
            {images.length > 1 ? (
              <div className="mt-4 grid grid-cols-4 gap-3">
                {images.map((image, index) => (
                  <button key={`${image}-${index}`} onClick={() => setSelectedImage(image)} className={`relative aspect-square overflow-hidden rounded-xl border ${selectedImage === image ? "border-black" : "border-neutral-200"}`}>
                    <Image src={image} alt={`${title}-${index + 1}`} fill className="object-cover" />
                  </button>
                ))}
              </div>
            ) : null}
          </section>

          <section className="flex flex-col justify-center">
            <span className="inline-flex w-fit rounded-full bg-neutral-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-neutral-700">
              {product.category ?? "Producto"}
            </span>
            <h1 className="mt-4 text-3xl font-semibold sm:text-4xl">{title}</h1>
            <p className="mt-4 text-base leading-7 text-neutral-600">{product.description ?? "Producto seleccionado para aportar valor real, diseño premium y una experiencia de compra más confiable."}</p>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              {product.comparePrice && product.comparePrice > product.price ? (
                <>
                  <span className="text-lg text-neutral-400 line-through">${product.comparePrice}</span>
                  <span className="rounded-full bg-rose-50 px-3 py-1 text-sm font-semibold text-rose-600">-{discount}%</span>
                </>
              ) : null}
              <p className="text-4xl font-bold text-black">${product.price}</p>
            </div>

            <div className="mt-6 grid gap-3 rounded-2xl border border-neutral-200 bg-white p-4 text-sm text-neutral-600">
              <div className="flex items-center justify-between"><span>Stock</span><span className="font-semibold text-black">{product.stock === false ? "Agotado" : "Disponible"}</span></div>
              <div className="flex items-center justify-between"><span>Envío</span><span className="font-semibold text-black">{product.shippingDays ?? "24-48 hs"}</span></div>
              <div className="flex items-center justify-between"><span>Categoría</span><span className="font-semibold text-black">{product.category ?? "General"}</span></div>
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <button onClick={handleAddToCart} className="flex-1 rounded-2xl bg-black px-5 py-3 text-sm font-semibold text-white transition hover:bg-neutral-800">Agregar al carrito</button>
              <Link href="/checkout" className="flex-1 rounded-2xl border border-neutral-300 px-5 py-3 text-center text-sm font-semibold text-neutral-900 transition hover:border-black">Comprar ahora</Link>
            </div>

            <div className="mt-8 rounded-2xl border border-neutral-200 bg-white p-5 text-sm text-neutral-600">
              <h2 className="font-semibold text-neutral-900">Por qué comprar en AVG Connects</h2>
              <ul className="mt-3 space-y-2">
                <li>• Envíos con seguimiento y procesos claros.</li>
                <li>• Productos seleccionados para ofrecer valor real y confianza.</li>
                <li>• Checkout simple, seguro y pensado para vender sin fricción.</li>
              </ul>
            </div>
          </section>
        </div>

        <section className="mt-12">
          <h2 className="text-2xl font-semibold">Productos relacionados</h2>
          <div className="mt-6 grid gap-6 md:grid-cols-3">
            {relatedProducts.slice(0, 3).map((item) => {
              const image = item.image ?? item.images?.[0] ?? "/placeholder-product.png";
              const relatedTitle = item.title ?? item.name ?? "Producto";
              return (
                <Link key={String(item._id)} href={`/product/${item._id}`} className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm transition hover:-translate-y-1">
                  <div className="relative aspect-square overflow-hidden rounded-xl bg-neutral-100">
                    <Image src={image} alt={relatedTitle} fill className="object-cover" />
                  </div>
                  <h3 className="mt-4 font-semibold">{relatedTitle}</h3>
                  <p className="mt-2 text-sm text-neutral-600">{item.category ?? "Producto premium"}</p>
                  <p className="mt-3 font-semibold">${item.price}</p>
                </Link>
              );
            })}
          </div>
        </section>
      </div>
    </main>
  );
}

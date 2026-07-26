"use client";

import Image from "next/image";
import Link from "next/link";
import { useCart } from "@/app/context/CartContext";

export interface Product {
  _id: string;
  title?: string;
  name?: string;
  description?: string;
  price: number;
  comparePrice?: number;
  image?: string;
  images?: string[];
  category?: string;
  shippingDays?: string;
  stock?: boolean;
}

interface Props {
  product: Product;
}

export default function ProductCard({ product }: Props) {

  const { addToCart } = useCart();

  const image =
    product.image ??
    product.images?.[0] ??
    "/placeholder-product.png";

  const title =
    product.title ??
    product.name ??
    "Producto";


  function handleAddCart() {
    addToCart({
      _id: product._id,
      name: title,
      price: product.price,
      image,
    });
  }


  return (
    <article className="group rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
      <Link href={`/product/${product._id}`}>
        <div className="relative h-56 w-full overflow-hidden rounded-xl bg-neutral-100">
          <Image src={image} alt={title} fill className="object-cover transition duration-300 group-hover:scale-105" />
        </div>
        <div className="mt-4 flex items-center justify-between gap-2">
          <span className="rounded-full bg-neutral-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-neutral-600">
            {product.category ?? "Producto"}
          </span>
          {product.comparePrice && product.comparePrice > product.price ? (
            <span className="text-xs font-semibold text-rose-600">-{Math.round(((product.comparePrice - product.price) / product.comparePrice) * 100)}%</span>
          ) : null}
        </div>
        <h3 className="mt-3 text-lg font-semibold text-neutral-900">{title}</h3>
        <p className="mt-2 text-sm leading-6 text-neutral-600">{product.description ?? "Producto seleccionado para aportar valor real al cliente."}</p>
      </Link>

      <div className="mt-4 flex items-end justify-between gap-3">
        <div>
          {product.comparePrice && product.comparePrice > product.price ? (
            <p className="text-sm text-neutral-400 line-through">${product.comparePrice}</p>
          ) : null}
          <p className="text-xl font-bold text-black">${product.price}</p>
        </div>
        <button onClick={handleAddCart} className="rounded-lg bg-black px-4 py-2 text-sm font-semibold text-white transition hover:bg-neutral-800">
          Comprar
        </button>
      </div>
    </article>
  );
}
"use client";

import Image from "next/image";
import { useCart } from "@/context/CartContext";

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

  const formattedPrice = new Intl.NumberFormat("es-US", {
    style: "currency",
    currency: "USD",
  }).format(product.price);

  const formattedComparePrice = product.comparePrice
    ? new Intl.NumberFormat("es-US", {
        style: "currency",
        currency: "USD",
      }).format(product.comparePrice)
    : null;

  function handleAddCart() {
    addToCart({
      _id: product._id,
      name: title,
      price: product.price,
      image,
      quantity: 1,
    });
  }

  return (
    <article className="group rounded-xl bg-white shadow-sm hover:shadow-xl transition-all duration-300 p-4 border border-neutral-100">

      <div className="relative w-full h-56 overflow-hidden rounded-lg bg-neutral-100">
        <Image
          src={image}
          alt={title}
          fill
          sizes="(max-width: 768px) 100vw, 300px"
          className="object-cover group-hover:scale-105 transition-transform duration-300"
        />
      </div>

      <h3 className="mt-4 font-semibold text-lg text-neutral-900">
        {title}
      </h3>

      {formattedComparePrice && (
        <p className="mt-2 text-sm text-gray-400 line-through">
          {formattedComparePrice}
        </p>
      )}

      <p className="text-pink-600 font-bold text-xl">
        {formattedPrice}
      </p>

      {product.shippingDays && (
        <p className="mt-2 text-sm text-gray-500">
          🚚 Envío estimado: {product.shippingDays}
        </p>
      )}

      <button
        type="button"
        onClick={handleAddCart}
        disabled={product.stock === false}
        className="
          mt-4
          w-full
          rounded-lg
          bg-black
          text-white
          py-3
          hover:bg-neutral-800
          transition
          disabled:bg-gray-400
        "
      >
        {product.stock === false
          ? "Sin stock"
          : "Agregar al carrito"}
      </button>

    </article>
  );
}
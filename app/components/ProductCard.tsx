"use client";

import Image from "next/image";
import Link from "next/link";
import { useCart } from "@/app/context/CartContext";
import { PLACEHOLDER_IMAGE } from "@/app/constants/placeholder";


export interface Product {

  _id: string;

  title?: string;

  name?: string;

  description?: string;

  price: number;

  comparePrice?: number;
  costPrice?: number;
  sku?: string;

  image?: string;

  images?: string[];

  category?: string;

  shippingDays?: string;

  stock?: number | boolean;
  inStock?: boolean;
  stockQuantity?: number;
  featured?: boolean;

}



interface Props {

  product: Product;

}





export default function ProductCard({
  product,
}: Props) {


  const {
    addToCart
  } = useCart();




  const image =
    product.image ??
    product.images?.[0] ??
    PLACEHOLDER_IMAGE;



  const title =
    product.title ??
    product.name ??
    "Producto";





  const discount =
    product.comparePrice &&
    product.comparePrice > product.price
      ? Math.round(
          (
            (product.comparePrice -
              product.price) /
            product.comparePrice
          ) * 100
        )
      : null;





  function handleAddCart(
    event: React.MouseEvent<HTMLButtonElement>
  ) {

    event.preventDefault();

    event.stopPropagation();



    addToCart({

      _id: product._id,

      name: title,

      price: product.price,

      comparePrice: product.comparePrice,
      image,
      inStock: product.inStock === true,
      stockQuantity: product.stockQuantity,

    },1);


  }

  function handleBuyNow(event: React.MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();
    addToCart({
      _id: product._id,
      name: title,
      price: product.price,
      comparePrice: product.comparePrice,
      image,
      inStock: product.inStock === true,
      stockQuantity: product.stockQuantity,
    },1);
    window.location.href = "/checkout";
  }

  return (

    <article className="ui-card ui-card-hover group overflow-hidden p-3 sm:p-4">



      <Link
        href={`/product/${product._id}`}
        className="block"
      >


        <div className="relative aspect-square w-full overflow-hidden rounded-[calc(var(--radius-lg)-0.25rem)] bg-neutral-100 dark:bg-zinc-800">
          <Image
            src={image}
            alt={title}
            fill
            sizes="(max-width:768px)100vw,25vw"
            className="object-cover transition duration-500 group-hover:scale-105"
            loading="lazy"
          />
          {discount ? <div className="ui-badge absolute left-3 top-3 bg-white/90">-{discount}%</div> : null}
          {product.featured ? <div className="absolute right-3 top-3 rounded-full bg-neutral-950 px-3 py-1 text-[11px] font-semibold text-white">Destacado</div> : null}
          <div className="absolute inset-0 bg-gradient-to-t from-black/10 via-transparent to-transparent opacity-0 transition duration-500 group-hover:opacity-100" />
        </div>






        <div className="mt-4 flex items-center justify-between gap-3">
          <span className="text-[11px] font-semibold uppercase tracking-[0.3em] text-neutral-500 dark:text-zinc-400">{product.category ?? "Producto"}</span>
          {discount && product.comparePrice ? <span className="text-sm font-medium text-neutral-400 line-through dark:text-zinc-500">${product.comparePrice.toLocaleString("es-US")}</span> : null}
        </div>

        <h3 className="mt-3 text-xl font-semibold tracking-[-0.02em] text-neutral-950 dark:text-white">{title}</h3>
        <p className="mt-2 line-clamp-2 text-sm leading-6 text-neutral-600 dark:text-zinc-300">{product.description ?? "Producto seleccionado para mejorar tu experiencia."}</p>



      </Link>







      <div className="mt-5 flex items-end justify-between gap-3">



        <div>


          {discount && product.comparePrice && (

            <p
              className="
              text-sm
              text-neutral-400
              line-through
              dark:text-zinc-500
              "
            >

              ${product.comparePrice.toLocaleString("es-US")}

            </p>

          )}






          <p className="text-2xl font-semibold tracking-[-0.02em] text-neutral-950 dark:text-white">${product.price.toLocaleString("es-US")}</p>


        </div>







        <div className="flex w-full flex-col gap-2 sm:w-auto">
          <button type="button" onClick={handleAddCart} disabled={product.inStock !== true} aria-label={`Agregar ${title} al carrito`} className="ui-button-primary">{product.inStock === true ? "Añadir" : "Sin stock"}</button>
          <button type="button" onClick={handleBuyNow} disabled={product.inStock !== true} aria-label={`Comprar ${title} ahora`} className="ui-button-secondary">Comprar ahora</button>
        </div>




      </div>




    </article>

  );

}

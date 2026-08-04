"use client";

import Image from "next/image";
import Link from "next/link";
import { useCart } from "@/app/context/CartContext";
import { PLACEHOLDER_IMAGE } from "@/app/constants/placeholder";
import { formatARS } from "@/lib/currency";


export interface Product {

  _id: string;

  title?: string;

  name?: string;

  description?: string;

  price: number;

  comparePrice?: number;
  costPrice?: number;
  sku?: string;
  slug?: string | null;

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

  const savings = discount && product.comparePrice
    ? product.comparePrice - product.price
    : null;





  function handleAddCart(
    event: React.MouseEvent<HTMLButtonElement>
  ) {

    event.preventDefault();

    event.stopPropagation();



    addToCart({

      _id: product._id,
      slug: product.slug ?? undefined,

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
      slug: product.slug ?? undefined,
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

    <article className="marketplace-product-card ui-card ui-card-hover ui-product-card group flex h-full flex-col">



      <Link
        href={`/product/${product.slug ?? product._id}`}
        className="block"
      >


        <div className="ui-product-image relative aspect-[4/4.15] w-full overflow-hidden">
          <Image
            src={image}
            alt={title}
            fill
            sizes="(max-width:768px)100vw,25vw"
            className="object-cover transition duration-300"
            loading="lazy"
          />
          {discount ? <div className="ui-offer-badge absolute left-3 top-3">{discount}% menos</div> : null}
          {product.featured ? <div className="absolute right-3 top-3 rounded-full bg-neutral-950 px-3 py-1 text-[11px] font-semibold text-white shadow-sm">Destacado</div> : null}
        </div>






        <div className="mt-4 flex items-center justify-between gap-3">
          <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-neutral-500 dark:text-zinc-400">{product.category ?? "Producto"}</span>
        </div>

        <h3 className="mt-3 line-clamp-2 text-lg font-semibold leading-snug tracking-[-0.03em] text-neutral-950 dark:text-white sm:text-xl">{title}</h3>
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

               {formatARS(product.comparePrice)}

            </p>

          )}






          <p className="ui-price">{formatARS(product.price)}</p>
          {savings ? <p className="mt-1 text-xs font-semibold text-[color:var(--color-offer)]">Ahorrás {formatARS(savings)}</p> : null}


        </div>







        <div className="flex w-full flex-col gap-2 sm:w-auto">
          <button type="button" data-testid={`product-card-add-${product._id}`} onClick={handleAddCart} disabled={product.inStock !== true} aria-label={`Agregar ${title} al carrito`} className="ui-button-primary">{product.inStock === true ? "Añadir" : "Sin stock"}</button>
          <button type="button" onClick={handleBuyNow} disabled={product.inStock !== true} aria-label={`Comprar ${title} ahora`} className="ui-button-secondary">Comprar ahora</button>
        </div>




      </div>




    </article>

  );

}

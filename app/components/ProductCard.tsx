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
      sku: product.sku,
      image,

    },1);


  }






  return (

    <article className="group overflow-hidden rounded-[1.9rem] border border-black/5 bg-white/85 p-4 shadow-[0_20px_70px_rgba(0,0,0,0.05)] backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_28px_90px_rgba(0,0,0,0.1)] active:scale-[0.99] dark:border-white/10 dark:bg-zinc-900/70 dark:shadow-[0_20px_80px_rgba(0,0,0,0.3)]">



      <Link
        href={`/product/${product._id}`}
        className="block"
      >


        <div className="relative h-72 w-full overflow-hidden rounded-[1.4rem] bg-neutral-100 dark:bg-zinc-800">
          <Image
            src={image}
            alt={title}
            fill
            sizes="(max-width:768px)100vw,25vw"
            className="object-cover transition duration-500 group-hover:scale-105"
          />
          {discount ? <div className="absolute left-3 top-3 rounded-full border border-black/10 bg-white/90 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-neutral-700 backdrop-blur dark:border-white/10 dark:bg-zinc-900/70 dark:text-zinc-100">-{discount}%</div> : null}
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







        <button onClick={handleAddCart} className="rounded-full border border-black/10 bg-neutral-950 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-neutral-800 active:scale-[0.98] dark:border-white/10 dark:bg-white dark:text-neutral-950 dark:hover:bg-zinc-100">Añadir</button>




      </div>




    </article>

  );

}
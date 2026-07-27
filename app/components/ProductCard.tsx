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

    <article className="group overflow-hidden rounded-[1.75rem] border border-white/70 bg-white/80 p-4 shadow-[0_18px_60px_rgba(0,0,0,0.06)] backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_24px_80px_rgba(0,0,0,0.1)]">



      <Link
        href={`/product/${product._id}`}
        className="block"
      >


        <div className="relative h-72 w-full overflow-hidden rounded-[1.35rem] bg-neutral-100">
          <Image
            src={image}
            alt={title}
            fill
            sizes="(max-width:768px)100vw,25vw"
            className="object-cover transition duration-500 group-hover:scale-105"
          />
          {discount ? <div className="absolute left-3 top-3 rounded-full bg-white/90 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-neutral-700 backdrop-blur">-{discount}%</div> : null}
        </div>






        <div className="mt-4 flex items-center justify-between gap-3">
          <span className="text-[11px] font-semibold uppercase tracking-[0.3em] text-neutral-500">{product.category ?? "Producto"}</span>
          {discount && product.comparePrice ? <span className="text-sm font-medium text-neutral-400 line-through">${product.comparePrice.toLocaleString("es-US")}</span> : null}
        </div>

        <h3 className="mt-3 text-xl font-semibold tracking-[-0.02em] text-neutral-950">{title}</h3>
        <p className="mt-2 line-clamp-2 text-sm leading-6 text-neutral-600">{product.description ?? "Producto seleccionado para mejorar tu experiencia."}</p>



      </Link>







      <div className="mt-5 flex items-end justify-between gap-3">



        <div>


          {discount && product.comparePrice && (

            <p
              className="
              text-sm
              text-neutral-400
              line-through
              "
            >

              ${product.comparePrice.toLocaleString("es-US")}

            </p>

          )}






          <p className="text-2xl font-semibold tracking-[-0.02em] text-neutral-950">${product.price.toLocaleString("es-US")}</p>


        </div>







        <button onClick={handleAddCart} className="rounded-full border border-neutral-200 bg-neutral-950 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-neutral-800">Añadir</button>




      </div>




    </article>

  );

}
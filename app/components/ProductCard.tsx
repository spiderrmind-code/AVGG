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

    <article className="group rounded-3xl border border-neutral-200 bg-white p-5 shadow transition-transform duration-300 hover:-translate-y-1 hover:shadow-2xl">



      <Link
        href={`/product/${product._id}`}
        className="block"
      >


        <div className="relative h-64 w-full overflow-hidden rounded-2xl bg-neutral-100">


          <Image

            src={image}

            alt={title}

            fill

            sizes="(max-width:768px)100vw,25vw"

            className="
            object-cover
            transition
            duration-300
            group-hover:scale-105
            "

          />


        </div>






        <div className="mt-4 flex items-center justify-between">


          <span
            className="
            rounded-full
            bg-neutral-100
            px-3
            py-1
            text-xs
            font-semibold
            uppercase
            "
          >

            {product.category ?? "Producto"}

          </span>




          {discount && (

            <span
              className="
              text-xs
              font-bold
              text-red-600
              "
            >

              -{discount}%

            </span>

          )}



        </div>







        <h3 className="mt-3 text-lg font-semibold text-neutral-900">

          {title}

        </h3>






        <p className="mt-2 line-clamp-2 text-sm text-neutral-600">

          {product.description ??
            "Producto seleccionado para mejorar tu experiencia."}

        </p>



      </Link>







      <div className="mt-6 flex items-end justify-between">



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






          <p className="text-2xl font-semibold text-black">${product.price.toLocaleString("es-US")}</p>


        </div>







        <button onClick={handleAddCart} className="rounded-[28px] bg-black px-6 py-3 text-sm font-semibold text-white transition hover:bg-neutral-800">Comprar</button>




      </div>




    </article>

  );

}
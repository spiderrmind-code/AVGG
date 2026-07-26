"use client";

import { useCart } from "@/app/context/CartContext";


interface Product {
  _id: string;
  name: string;
  price: number;
  image: string;
}


export default function AddToCartButton({
  product,
}: {
  product: Product;
}) {


  const {
    addToCart
  } = useCart();



  function handleAdd() {

    addToCart({
      _id: product._id,
      name: product.name,
      price: product.price,
      comparePrice: (product as any).comparePrice ?? (product as any).oldPrice,
      image: product.image,
    });

  }



  return (

    <button

      onClick={handleAdd}

      className="
      mt-8
      w-full
      rounded-xl
      bg-black
      px-8
      py-4
      font-semibold
      text-white
      transition
      hover:bg-neutral-800
      "

    >

      Agregar al carrito

    </button>

  );

}
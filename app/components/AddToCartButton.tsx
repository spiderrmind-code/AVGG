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
      className="mt-8 w-full rounded-full bg-neutral-950 px-8 py-4 text-sm font-semibold text-white shadow-[0_10px_30px_rgba(0,0,0,0.12)] transition hover:-translate-y-0.5 hover:bg-neutral-800"
    >
      Agregar al carrito
    </button>
  );

}
"use client";

import { useCart } from "@/app/context/CartContext";
import { WISHLIST_STORAGE_KEY, readWishlist } from "@/lib/wishlist";


interface Product {
  _id: string;
  name: string;
  price: number;
  image: string;
  inStock?: boolean;
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

    if (product.inStock === false) return;

    addToCart({
      _id: product._id,
      name: product.name,
      price: product.price,
      image: product.image,
      inStock: product.inStock === true,
    });

  }

  function handleWishlist() {
    try {
      const current = readWishlist(localStorage.getItem(WISHLIST_STORAGE_KEY));
      const item = { _id: product._id, name: product.name, price: product.price, image: product.image, inStock: product.inStock === true };
      const next = current.some((saved) => saved._id === item._id) ? current.filter((saved) => saved._id !== item._id) : [...current, item];
      localStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify(next));
    } catch { /* storage can be unavailable */ }
  }



  return (
    <div className="mt-8 flex gap-3">
    <button
      onClick={handleAdd}
      disabled={product.inStock === false}
      className="w-full rounded-full bg-neutral-950 px-8 py-4 text-sm font-semibold text-white shadow-[0_10px_30px_rgba(0,0,0,0.12)] transition hover:-translate-y-0.5 hover:bg-neutral-800"
    >
      {product.inStock === false ? "Sin stock" : "Agregar al carrito"}
    </button>
    <button type="button" onClick={handleWishlist} className="rounded-full border border-black/10 px-5 py-4 text-sm font-semibold">Favorito</button>
    </div>
  );

}

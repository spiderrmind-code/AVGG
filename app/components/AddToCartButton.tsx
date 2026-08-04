"use client";

import { useCart } from "@/app/context/CartContext";
import { WISHLIST_STORAGE_KEY, readWishlist } from "@/lib/wishlist";


interface Product {
  _id: string;
  slug?: string;
  name: string;
  price: number;
  image: string;
  inStock?: boolean;
  stockQuantity?: number;
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
      slug: product.slug,
      name: product.name,
      price: product.price,
      image: product.image,
      inStock: product.inStock === true,
      stockQuantity: product.stockQuantity,
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
    <div className="mt-6 flex flex-col gap-3 sm:flex-row">
    <button
      onClick={handleAdd}
      disabled={product.inStock === false}
      className="ui-button-primary min-h-[3.25rem] w-full px-8 sm:flex-1"
    >
      {product.inStock === false ? "Sin stock" : "Agregar al carrito"}
    </button>
    <button type="button" onClick={handleWishlist} className="ui-button-secondary min-h-[3.25rem] px-6">Favorito</button>
    </div>
  );

}

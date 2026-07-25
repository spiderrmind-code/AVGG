"use client";

import {
  createContext,
  useContext,
  useState,
  ReactNode,
} from "react";

export interface CartItem {
  _id: string;
  name: string;
  price: number;
  image: string;
  quantity: number;
}

interface CartContextType {
  cart: CartItem[];
  addToCart: (item: CartItem) => void;
  removeFromCart: (id: string) => void;
  clearCart: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [cart, setCart] = useState<CartItem[]>([]);

  function addToCart(item: CartItem) {
    setCart((prev) => {
      const existing = prev.find(
        (product) => product._id === item._id
      );

      if (existing) {
        return prev.map((product) =>
          product._id === item._id
            ? {
                ...product,
                quantity: product.quantity + 1,
              }
            : product
        );
      }

      return [...prev, item];
    });
  }

  function removeFromCart(id: string) {
    setCart((prev) =>
      prev.filter((product) => product._id !== id)
    );
  }

  function clearCart() {
    setCart([]);
  }

  return (
    <CartContext.Provider
      value={{
        cart,
        addToCart,
        removeFromCart,
        clearCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);

  if (!context) {
    throw new Error(
      "useCart debe estar dentro de CartProvider"
    );
  }

  return context;
}
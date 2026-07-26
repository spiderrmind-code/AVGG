"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";


export type CartItem = {
  _id: string;
  name: string;
  image: string;
  price: number;
  quantity: number;
  comparePrice?: number;
  sku?: string;
};



type AddCartItem = Omit<CartItem, "quantity">;



type CartContextType = {
  cart: CartItem[];

  addToCart: (
    item: AddCartItem,
    quantity?: number
  ) => void;

  removeFromCart: (
    id: string
  ) => void;

  updateQuantity: (
    id: string,
    quantity: number
  ) => void;

  clearCart: () => void;

  total: number;

  itemsCount: number;
};



const CartContext =
  createContext<CartContextType | undefined>(
    undefined
  );



const STORAGE_KEY =
  "avgconnects_cart";




export function CartProvider({
  children,
}: {
  children: ReactNode;
}) {


  const [cart, setCart] =
    useState<CartItem[]>([]);


  const [hydrated, setHydrated] =
    useState(false);




  useEffect(() => {


    try {

      const saved =
        localStorage.getItem(
          STORAGE_KEY
        );


      if(saved){

        const parsed =
          JSON.parse(saved);


        if(
          Array.isArray(parsed)
        ){

          setCart(
            parsed.filter(
              (item) =>
                item &&
                item._id &&
                item.name &&
                typeof item.price === "number"
            )
          );

        }

      }


    } catch(error){

      console.error(
        "Error cargando carrito",
        error
      );


      localStorage.removeItem(
        STORAGE_KEY
      );


    } finally {


      setHydrated(true);


    }


  }, []);






  useEffect(() => {


    if(!hydrated)
      return;



    try {


      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(cart)
      );


    } catch(error){


      console.error(
        "Error guardando carrito",
        error
      );


    }



  },[
    cart,
    hydrated
  ]);







  function addToCart(
    item:AddCartItem,
    quantity = 1
  ){


    if(
      !item._id ||
      !item.name ||
      !item.price
    ){
      return;
    }



    const amount =
      Math.max(
        1,
        quantity
      );



    setCart(
      current => {


        const existing =
          current.find(
            product =>
              product._id === item._id
          );



        if(existing){


          return current.map(
            product =>
              product._id === item._id
                ? {
                    ...product,
                    quantity:
                      product.quantity +
                      amount,
                  }
                : product
          );


        }




        return [
          ...current,
          {
            ...item,
            quantity: amount,
          }
        ];

      }
    );

  }









  function removeFromCart(
    id:string
  ){


    setCart(
      current =>
        current.filter(
          product =>
            product._id !== id
        )
    );


  }









  function updateQuantity(
    id:string,
    quantity:number
  ){


    if(quantity <= 0){

      removeFromCart(id);

      return;

    }



    setCart(
      current =>
        current.map(
          product =>
            product._id === id
              ? {
                  ...product,
                  quantity,
                }
              : product
        )
    );


  }









  function clearCart(){

    setCart([]);

    localStorage.removeItem(
      STORAGE_KEY
    );

  }








  const total =
    useMemo(
      () =>
        cart.reduce(
          (sum,item)=>
            sum +
            item.price *
            item.quantity,
          0
        ),
      [cart]
    );





  const itemsCount =
    useMemo(
      () =>
        cart.reduce(
          (sum,item)=>
            sum +
            item.quantity,
          0
        ),
      [cart]
    );







  return (

    <CartContext.Provider

      value={{
        cart,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        total,
        itemsCount,
      }}

    >

      {children}

    </CartContext.Provider>

  );

}







export function useCart(){


  const context =
    useContext(
      CartContext
    );



  if(!context){

    throw new Error(
      "useCart debe usarse dentro de CartProvider"
    );

  }



  return context;


}
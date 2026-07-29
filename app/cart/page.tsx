"use client";

import Link from "next/link";
import Image from "next/image";
import { useCart } from "@/context/CartContext";
import CartSummary from "@/components/CartSummary";
import { formatARS } from "@/lib/currency";

export default function CartPage() {

  const {
    cart,
    hydrated,
    updateQuantity,
    removeFromCart
  } = useCart();


  const subtotal = cart.reduce(
    (acc, item) =>
      acc + item.price * item.quantity,
    0
  );


  if (!hydrated) {
    return <main className="min-h-screen px-4 py-16"><div className="ui-surface mx-auto max-w-5xl p-8 text-center">Cargando carrito...</div></main>;
  }

  if (cart.length === 0) {

    return (
      <main className="min-h-screen px-4 py-16 sm:px-6 lg:px-8">
        <div className="ui-surface mx-auto max-w-5xl p-8 text-center">
          <h1 className="text-3xl font-semibold tracking-[-0.02em] text-neutral-950 dark:text-white">Tu carrito está vacío</h1>
          <p className="mt-3 text-neutral-600 dark:text-zinc-300">Agrega productos para empezar tu compra.</p>
          <Link href="/" className="ui-button-primary mt-8">Explorar productos</Link>
        </div>
      </main>
    );
  }



  return (

    <main className="min-h-screen px-4 py-10 sm:px-6 lg:px-8">

      <div className="mx-auto max-w-7xl">

        <h1 className="text-3xl font-semibold tracking-[-0.02em] text-neutral-950">
          Tu carrito está listo para cerrar la compra
        </h1>


        <div className="mt-8 grid gap-8 lg:grid-cols-[1.1fr_0.55fr]">


          <section className="space-y-4">

            {cart.map((item) => (

              <div
                key={item._id}
                className="ui-card flex flex-col gap-4 p-4 sm:flex-row sm:items-center"
              >

                <div className="relative h-24 w-full sm:w-24">

                  <Image
                    src={item.image}
                    alt={item.name}
                    fill
                    className="rounded-xl object-cover"
                  />

                </div>


                <div className="flex-1">

                  <h2 className="font-semibold">
                    {item.name}
                  </h2>

                  <p className="mt-1 text-sm text-neutral-600">
                    {formatARS(item.price)} c/u
                  </p>

                </div>



                <div className="flex items-center gap-2">

                  <button
                    aria-label={`Reducir cantidad de ${item.name}`}
                    className="ui-button-secondary min-h-10 px-3"
                    onClick={() =>
                      updateQuantity(
                        item._id,
                        item.quantity - 1
                      )
                    }
                  >
                    -
                  </button>


                  <span className="min-w-8 text-center text-sm font-semibold text-neutral-900 dark:text-white">
                    {item.quantity}
                  </span>


                  <button
                    aria-label={`Aumentar cantidad de ${item.name}`}
                    disabled={item.stockQuantity !== undefined && item.quantity >= item.stockQuantity}
                    className="ui-button-secondary min-h-10 px-3"
                    onClick={() =>
                      updateQuantity(
                        item._id,
                        item.quantity + 1
                      )
                    }
                  >
                    +
                  </button>

                </div>



                <div className="text-right">

                  <p className="font-semibold">
                    {formatARS(item.price * item.quantity)}
                  </p>


                  <button
                    className="mt-2 text-sm font-medium text-rose-600 transition hover:text-rose-700"
                    onClick={() =>
                      removeFromCart(item._id)
                    }
                  >
                    Eliminar
                  </button>

                </div>


              </div>

            ))}

          </section>



          <div className="space-y-4">

            <CartSummary />


            <div className="ui-card p-6">

              <h2 className="text-lg font-semibold">
                Subtotal
              </h2>


              <p className="mt-2 text-2xl font-semibold">
                {formatARS(subtotal)}
              </p>


              <p className="mt-2 text-sm text-neutral-600">
                Envío gratis en compras superiores a $10000.
              </p>


              <Link
                href="/checkout"
                className="ui-button-primary mt-6 w-full"
              >
                Finalizar compra
              </Link>


            </div>


          </div>


        </div>


      </div>

    </main>

  );

}

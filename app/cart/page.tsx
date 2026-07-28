"use client";

import Link from "next/link";
import Image from "next/image";
import { useCart } from "@/context/CartContext";
import CartSummary from "@/components/CartSummary";

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
    return <main className="min-h-screen px-4 py-16"><div className="mx-auto max-w-5xl rounded-[2rem] bg-white p-8 text-center shadow-sm">Cargando carrito...</div></main>;
  }

  if (cart.length === 0) {

    return (
      <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(255,47,146,0.08),_transparent_45%),linear-gradient(180deg,_#f8f5ef_0%,_#f3eee7_100%)] px-4 py-16 sm:px-6 lg:px-8 dark:bg-[radial-gradient(circle_at_top_left,_rgba(255,47,146,0.12),_transparent_45%),linear-gradient(180deg,_#08090d_0%,_#0f1117_100%)]">
        <div className="mx-auto max-w-5xl rounded-[2rem] border border-white/70 bg-white/80 p-8 text-center shadow-[0_24px_80px_rgba(0,0,0,0.08)] backdrop-blur-xl dark:border-white/10 dark:bg-zinc-900/70">
          <h1 className="text-3xl font-semibold tracking-[-0.02em] text-neutral-950 dark:text-white">Tu carrito está vacío</h1>
          <p className="mt-3 text-neutral-600 dark:text-zinc-300">Agrega productos para empezar tu compra.</p>
          <Link href="/" className="mt-8 inline-flex min-h-[48px] rounded-full bg-neutral-950 px-5 py-3 text-sm font-semibold text-white shadow-[0_16px_45px_rgba(0,0,0,0.16)] transition hover:-translate-y-0.5 hover:bg-neutral-800 active:scale-[0.98]">Explorar productos</Link>
        </div>
      </main>
    );
  }



  return (

    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(0,0,0,0.03),_transparent_45%)] px-4 py-10 sm:px-6 lg:px-8">

      <div className="mx-auto max-w-7xl">

        <h1 className="text-3xl font-semibold tracking-[-0.02em] text-neutral-950">
          Tu carrito está listo para cerrar la compra
        </h1>


        <div className="mt-8 grid gap-8 lg:grid-cols-[1.1fr_0.55fr]">


          <section className="space-y-4">

            {cart.map((item) => (

              <div
                key={item._id}
                className="flex flex-col gap-4 rounded-[1.5rem] border border-white/70 bg-white/80 p-4 shadow-[0_16px_50px_rgba(0,0,0,0.05)] backdrop-blur-xl sm:flex-row sm:items-center dark:border-white/10 dark:bg-zinc-900/70"
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
                    ${item.price.toLocaleString("es-AR")} c/u
                  </p>

                </div>



                <div className="flex items-center gap-2">

                  <button
                    aria-label={`Reducir cantidad de ${item.name}`}
                    className="min-h-[40px] rounded-full border border-black/10 bg-white/80 px-3 py-1 text-sm font-semibold text-neutral-700 transition hover:bg-white dark:border-white/10 dark:bg-white/10 dark:text-zinc-200"
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
                    className="min-h-[40px] rounded-full border border-black/10 bg-white/80 px-3 py-1 text-sm font-semibold text-neutral-700 transition hover:bg-white dark:border-white/10 dark:bg-white/10 dark:text-zinc-200"
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
                    ${(item.price * item.quantity).toLocaleString("es-AR")}
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


            <div className="rounded-2xl border bg-white p-6 shadow-sm">

              <h2 className="text-lg font-semibold">
                Subtotal
              </h2>


              <p className="mt-2 text-2xl font-semibold">
                ${subtotal.toLocaleString("es-AR")}
              </p>


              <p className="mt-2 text-sm text-neutral-600">
                Envío gratis en compras superiores a $10000.
              </p>


              <Link
                href="/checkout"
                className="mt-6 block min-h-[48px] rounded-full bg-neutral-950 px-5 py-4 text-center font-semibold text-white shadow-[0_16px_45px_rgba(0,0,0,0.16)] transition hover:-translate-y-0.5 hover:bg-neutral-800 active:scale-[0.98]"
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

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
    return <main className="ui-page"><div className="ui-surface mx-auto max-w-5xl p-8 text-center">Cargando carrito...</div></main>;
  }

  if (cart.length === 0) {

    return (
      <main className="ui-page flex items-center">
        <div className="ui-surface mx-auto max-w-5xl p-8 text-center sm:p-10">
          <h1 className="text-3xl font-semibold tracking-[-0.02em] text-neutral-950 dark:text-white">Tu carrito está vacío</h1>
          <p className="mt-3 text-neutral-600 dark:text-zinc-300">Agrega productos para empezar tu compra.</p>
          <Link href="/" className="ui-button-primary mt-8">Explorar productos</Link>
        </div>
      </main>
    );
  }



  return (

    <main className="ui-page">

      <div className="mx-auto max-w-7xl">

        <p className="ui-eyebrow">Carrito</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-[-0.045em] text-[color:var(--color-text)] sm:text-4xl">
          Tu carrito está listo para cerrar la compra
        </h1>


        <div className="mt-8 grid gap-8 lg:grid-cols-[1.1fr_0.55fr]">


          <section className="space-y-4">

            {cart.map((item) => (

              <div
                key={item._id}
                className="ui-card flex flex-col gap-5 p-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)] sm:flex-row sm:items-center sm:p-5"
              >

                <div className="ui-product-image relative h-28 w-full overflow-hidden sm:h-24 sm:w-24">

                  <Image
                    src={item.image}
                    alt={item.name}
                    fill
                    className="rounded-[var(--radius-md)] object-cover"
                  />

                </div>


                <div className="flex-1">

                  <h2 className="font-semibold text-[color:var(--color-text)]">
                    {item.name}
                  </h2>

                  <p className="mt-1 text-sm text-[color:var(--color-text-muted)]">
                    {formatARS(item.price)} c/u
                  </p>

                </div>



                <div className="flex items-center gap-2 rounded-[var(--radius-md)] border border-[color:var(--color-border)] bg-[color:var(--color-surface-muted)] p-1">

                  <button
                    type="button"
                    aria-label={`Reducir cantidad de ${item.name}`}
                    className="ui-button-secondary min-h-11 min-w-11 px-3"
                    onClick={() =>
                      updateQuantity(
                        item._id,
                        item.quantity - 1
                      )
                    }
                  >
                    -
                  </button>


                  <span aria-live="polite" aria-atomic="true" className="min-w-8 text-center text-sm font-semibold text-neutral-900 dark:text-white">
                    {item.quantity}
                  </span>


                  <button
                    type="button"
                    aria-label={`Aumentar cantidad de ${item.name}`}
                    disabled={item.stockQuantity !== undefined && item.quantity >= item.stockQuantity}
                    className="ui-button-secondary min-h-11 min-w-11 px-3"
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



                <div className="flex items-center justify-between gap-4 border-t border-[color:var(--color-border)] pt-4 sm:block sm:border-0 sm:pt-0 sm:text-right">

                  <p className="font-semibold">
                    {formatARS(item.price * item.quantity)}
                  </p>


                  <button
                    type="button"
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


            <div className="ui-commerce-panel p-6 sm:p-7">

              <h2 className="text-lg font-semibold">
                Subtotal
              </h2>


              <p className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-[color:var(--color-text)]">
                {formatARS(subtotal)}
              </p>


              <p className="mt-2 text-sm text-[color:var(--color-text-muted)]">
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

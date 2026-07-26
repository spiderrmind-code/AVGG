import Image from "next/image";
import Link from "next/link";
import AddToCartButton from "@/app/components/AddToCartButton";
import { PLACEHOLDER_IMAGE } from "@/app/constants/placeholder";


interface Product {

  _id: string;

  name: string;

  description?: string;

  price: number;

  comparePrice?: number;

  image?: string;

  images?: string[];

  category?: string;

  shippingDays?: string;

  stock?: number | boolean;

}




async function getProduct(id: string) {
  try {
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const res = await fetch(`${baseUrl}/api/products/${id}`, {
      cache: "no-store",
    });



    if (!res.ok) {

      return null;

    }



    const data = await res.json();



    return data.product ?? null;


  } catch (error) {

    console.error(
      "ERROR PRODUCT PAGE:",
      error
    );

    return null;

  }

}







export default async function ProductPage({

  params,

}: {

  params: Promise<{
    id: string;
  }>;

}) {


  const {
    id
  } = await params;




  const product =
    await getProduct(id);






  if (!product) {


    return (

      <main className="min-h-screen p-10">

        <h1 className="text-3xl font-bold">
          Producto no encontrado
        </h1>


        <Link
          href="/"
          className="mt-5 inline-block underline"
        >
          Volver a la tienda
        </Link>


      </main>

    );

  }







  const image =

    product.image ??
    product.images?.[0] ??
    PLACEHOLDER_IMAGE;






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






  return (


    <main
      className="
      min-h-screen
      bg-neutral-50
      px-5
      py-10
      "
    >


      <div
        className="
        mx-auto
        max-w-7xl
        "
      >



        <Link

          href="/"

          className="
          text-sm
          text-neutral-600
          hover:text-black
          "

        >

          ← Volver

        </Link>







        <section

          className="
          mt-8
          grid
          gap-10
          rounded-3xl
          bg-white
          p-6
          shadow-sm
          md:grid-cols-2
          "

        >





          <div

            className="
            relative
            h-[500px]
            overflow-hidden
            rounded-2xl
            bg-neutral-100
            "

          >


            <Image

              src={image}

              alt={product.name}

              fill

              sizes="
              (max-width:768px)100vw,
              50vw
              "

              className="
              object-contain
              "

            />


          </div>










          <div

            className="
            flex
            flex-col
            justify-center
            "

          >





            <span

              className="
              text-xs
              uppercase
              tracking-[0.3em]
              text-neutral-500
              "

            >

              {product.category ?? "Producto"}

            </span>






            <h1

              className="
              mt-4
              text-4xl
              font-bold
              text-neutral-900
              "

            >

              {product.name}

            </h1>







            <p

              className="
              mt-5
              leading-7
              text-neutral-600
              "

            >

              {product.description ??
              "Producto seleccionado para vos."}

            </p>








            <div className="mt-8">


              {
                product.comparePrice && (

                  <p

                    className="
                    text-lg
                    text-neutral-400
                    line-through
                    "

                  >

                    ${product.comparePrice.toLocaleString("es-US")}

                  </p>

                )
              }






              <div
                className="
                flex
                items-center
                gap-4
                "
              >



                <p

                  className="
                  text-4xl
                  font-bold
                  "

                >

                  ${product.price.toLocaleString("es-US")}

                </p>





                {
                  discount && (

                    <span

                      className="
                      rounded-full
                      bg-red-100
                      px-3
                      py-1
                      text-sm
                      font-bold
                      text-red-600
                      "

                    >

                      -{discount}%

                    </span>

                  )
                }



              </div>


            </div>









            <div className="mt-6 space-y-2 text-sm">


              <p>
                🚚 Envío:
                {" "}
                {product.shippingDays ?? "Rápido y seguro"}
              </p>


              <p>
                ✅ Compra segura
              </p>


              <p>
                🔒 Pago protegido con Mercado Pago
              </p>


            </div>









            <AddToCartButton

              product={{

                _id: product._id,

                name: product.name,

                price: product.price,

                image,

              }}

            />






          </div>






        </section>



      </div>


    </main>

  );

}
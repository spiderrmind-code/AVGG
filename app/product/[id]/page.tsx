import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import AddToCartButton from "@/app/components/AddToCartButton";
import { PLACEHOLDER_IMAGE } from "@/app/constants/placeholder";
import { resolveAppBaseUrl } from "@/lib/app-url";


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

  inStock: boolean;
  stockQuantity?: number;

}




async function getProduct(id: string): Promise<{ product: Product | null; unavailable: boolean }> {
  try {
    const envOrigin = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXTAUTH_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "");
    const baseUrl = envOrigin || "http://localhost:3000";
    const res = await fetch(`${baseUrl}/api/products/${id}`, {
      cache: "no-store",
    });



    if (!res.ok) return { product: null, unavailable: res.status >= 500 };



    const data = await res.json();



    return { product: data.product ?? null, unavailable: false };


  } catch (error) {

    console.error(
      "ERROR PRODUCT PAGE:",
      error
    );

    return { product: null, unavailable: true };

  }

}







export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const { product } = await getProduct(id);
  if (!product) return { title: "Producto no encontrado", robots: { index: false, follow: false } };
  const title = product.name || "Producto";
  const description = product.description?.trim() || `Conocé ${title} en AVG Connects.`;
  const image = product.image ?? product.images?.[0];
  return { title, description, alternates: { canonical: `/product/${encodeURIComponent(id)}` }, openGraph: { title, description, type: "website", images: image ? [{ url: image, alt: title }] : undefined } };
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




  const { product, unavailable } = await getProduct(id);






  if (!product) {
    if (!unavailable) notFound();
    return <main className="min-h-screen p-10"><h1 className="text-3xl font-bold">No pudimos cargar este producto</h1><p className="mt-3 text-neutral-600">Intentá nuevamente en unos minutos.</p><Link href="/" className="mt-5 inline-block underline">Volver a la tienda</Link></main>;
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



        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({ "@context": "https://schema.org", "@graph": [
          { "@type": "Product", name: product.name, description: product.description, image: [image], offers: { "@type": "Offer", price: product.price, priceCurrency: "ARS", availability: product.inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock", url: `${resolveAppBaseUrl()}/product/${encodeURIComponent(id)}` } },
          { "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1, name: "Inicio", item: resolveAppBaseUrl() }, { "@type": "ListItem", position: 2, name: product.name }] },
        ] }).replace(/</g, "\\u003c") }} />
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





          <div className="relative h-[520px] overflow-hidden rounded-[1.8rem] bg-neutral-100">


            <Image

              src={image}

              alt={product.name}

              fill

              sizes="
              (max-width:768px)100vw,
              50vw
              "

              className="object-contain transition duration-500 hover:scale-[1.02]"

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

              className="inline-flex w-fit rounded-full border border-black/10 bg-white/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-neutral-600 backdrop-blur"

            >

              {product.category ?? "Producto"}

            </span>






            <h1

              className="mt-4 text-4xl font-semibold tracking-[-0.02em] text-neutral-950 sm:text-5xl"

            >

              {product.name}

            </h1>







            <p

              className="mt-5 max-w-2xl text-base leading-8 text-neutral-600"

            >

              {product.description ??
              "Producto seleccionado para vos."}

            </p>








            <div className="mt-8">


              {
                product.comparePrice && (

                  <p

                    className="text-lg text-neutral-400 line-through"

                  >

                    ${product.comparePrice.toLocaleString("es-US")}

                  </p>

                )
              }






              <div
                className="mt-2 flex items-center gap-4"
              >



                <p

                  className="text-4xl font-semibold tracking-[-0.02em] text-neutral-950"

                >

                  ${product.price.toLocaleString("es-US")}

                </p>





                {
                  discount && (

                    <span

                      className="rounded-full bg-rose-50 px-3 py-1 text-sm font-semibold text-rose-600"

                    >

                      -{discount}%

                    </span>

                  )
                }



              </div>


            </div>









            <div className="mt-6 grid gap-3 rounded-[1.4rem] border border-black/10 bg-white/80 p-4 text-sm text-neutral-700">
              <div className="flex items-center justify-between"><span>Envío</span><span className="font-semibold text-neutral-950">{product.shippingDays ?? "24-48 hs"}</span></div>
              <div className="flex items-center justify-between"><span>Compra segura</span><span className="font-semibold text-neutral-950">Protegida</span></div>
              <div className="flex items-center justify-between"><span>Pago</span><span className="font-semibold text-neutral-950">Mercado Pago</span></div>
            </div>









            <AddToCartButton

              product={{

                _id: product._id,

                name: product.name,

                price: product.price,

                image,
                inStock: product.inStock,

              }}

            />






          </div>






        </section>



      </div>


    </main>

  );

}

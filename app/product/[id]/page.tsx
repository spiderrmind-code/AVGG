import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import AddToCartButton from "@/app/components/AddToCartButton";
import { PLACEHOLDER_IMAGE } from "@/app/constants/placeholder";
import { resolveAppBaseUrl } from "@/lib/app-url";
import { formatARS } from "@/lib/currency";
import { ObjectId } from "mongodb";
import { escapeRegex, isValidCatalogSlug, normalizePublicProduct } from "@/lib/catalog";
import { getDb } from "@/lib/mongo";


interface Product {

  _id: string;
  slug?: string | null;

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
    if (!id || id.length > 120) return { product: null, unavailable: false };
    const db = await getDb();
    const record = ObjectId.isValid(id)
      ? await db.collection("products").findOne({ _id: new ObjectId(id), active: { $ne: false } })
      : isValidCatalogSlug(id)
        ? await db.collection("products").findOne({ slug: { $regex: `^${escapeRegex(id)}$`, $options: "i" }, active: { $ne: false } })
        : null;
    return { product: record ? normalizePublicProduct(record) : null, unavailable: false };


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
      bg-transparent
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
          ui-button-secondary
          w-fit
          "

        >

          ← Volver

        </Link>







        <section

          className="
          mt-8
          grid
          gap-10
          rounded-[var(--radius-xl)]
          border
          border-[color:var(--color-border)]
          bg-[color:var(--color-surface-strong)]
          p-4
          shadow-[var(--shadow-soft)]
          sm:p-6
          md:grid-cols-2
          "

        >





          <div className="relative min-h-[360px] overflow-hidden rounded-[calc(var(--radius-xl)-0.35rem)] bg-[color:var(--color-surface-muted)] md:h-[520px]">


            <Image

              src={image}

              alt={product.name}

              fill

              sizes="
              (max-width:768px)100vw,
              50vw
              "

            className="object-contain p-5 transition duration-500 hover:scale-[1.02] sm:p-8"

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

            className="ui-badge w-fit"

            >

              {product.category ?? "Producto"}

            </span>






            <h1

            className="mt-4 text-4xl font-semibold tracking-[-0.045em] text-[color:var(--color-text)] sm:text-5xl"

            >

              {product.name}

            </h1>







            <p

            className="mt-5 max-w-2xl text-base leading-7 text-[color:var(--color-text-muted)]"

            >

              {product.description ??
              "Producto seleccionado para vos."}

            </p>








            <div className="mt-8 rounded-[var(--radius-lg)] border border-[color:var(--color-border)] bg-[color:var(--color-surface-muted)] p-5">


              {
                product.comparePrice && product.comparePrice > product.price && (

                  <p

                  className="text-base text-[color:var(--color-text-subtle)] line-through"

                  >

                  {formatARS(product.comparePrice)}

                  </p>

                )
              }






              <div
                className="mt-2 flex items-center gap-4"
              >



                <p

                className="text-4xl font-semibold tracking-[-0.05em] text-[color:var(--color-text)]"

                >

                  {formatARS(product.price)}

                </p>





                {
                  discount && (

                    <span

                      className="ui-offer-badge"

                    >

                      -{discount}%

                    </span>

                  )
                }



              </div>


            </div>









            <div className="ui-subtle-panel mt-5 grid gap-3 p-5 text-sm text-[color:var(--color-text-muted)]">
              <div className="flex items-center justify-between"><span>Envío</span><span className="font-semibold text-neutral-950">{product.shippingDays ?? "24-48 hs"}</span></div>
              <div className="flex items-center justify-between"><span>Compra segura</span><span className="font-semibold text-neutral-950">Protegida</span></div>
              <div className="flex items-center justify-between"><span>Pago</span><span className="font-semibold text-neutral-950">Mercado Pago</span></div>
            </div>









            <AddToCartButton

              product={{

                _id: product._id,
                slug: product.slug ?? undefined,

                name: product.name,

                price: product.price,

                image,
                inStock: product.inStock,
                stockQuantity: product.stockQuantity,

              }}

            />






          </div>






        </section>



      </div>


    </main>

  );

}

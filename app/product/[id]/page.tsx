import Image from "next/image";
import Link from "next/link";

interface Product {
  _id: string;
  name: string;
  description?: string;
  price: number;
  comparePrice?: number;
  image: string;
  category?: string;
  shippingDays?: string;
}

async function getProduct(id: string) {
  const res = await fetch(
    `/api/products/${id}`,
    {
      cache: "no-store",
    }
  );

  if (!res.ok) {
    return null;
  }

  const data = await res.json();

  return data.product;
}

export default async function ProductPage({
  params,
}: {
  params: {
    id: string;
  };
}) {
  const product = await getProduct(params.id);

  if (!product) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        Producto no encontrado
      </div>
    );
  }

  return (
    <main className="min-h-screen p-10">

      <Link href="/">
        ← Volver
      </Link>

      <section className="grid md:grid-cols-2 gap-10 mt-8">

        <div className="relative h-[500px]">
          <Image
            src={product.image}
            alt={product.name}
            fill
            className="object-contain"
          />
        </div>

        <div>

          <h1 className="text-4xl font-bold">
            {product.name}
          </h1>

          <p className="mt-5 text-gray-600">
            {product.description}
          </p>

          <div className="mt-6">

            {product.comparePrice && (
              <span className="line-through text-gray-400">
                ${product.comparePrice}
              </span>
            )}

            <p className="text-3xl font-bold">
              ${product.price}
            </p>

          </div>

          <p className="mt-5">
            🚚 Envío: {product.shippingDays}
          </p>

          <button
            className="
              mt-8
              bg-black
              text-white
              px-8
              py-4
              rounded-xl
            "
          >
            Agregar al carrito
          </button>

        </div>

      </section>

    </main>
  );
}
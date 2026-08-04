import Link from "next/link";

export const metadata = {
  title: "Contacto | AVG Connects",
  description: "Canales de contacto de AVG Connects para soporte, pedidos y consultas.",
};

export default function ContactoPage() {
  return (
    <main className="min-h-screen bg-neutral-50 px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl rounded-3xl border border-neutral-200 bg-white p-8 shadow-sm sm:p-10">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-neutral-500">Contacto</p>
        <h1 className="mt-4 text-3xl font-semibold sm:text-4xl">Estamos disponibles para ayudarte a comprar con confianza.</h1>
        <p className="mt-5 text-lg leading-8 text-neutral-600">
          Si necesitás asesoramiento, ayuda con un pedido o querés conocer más sobre nuestros productos, escribinos por cualquiera de estos canales.
        </p>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {[
            ["Email", "[EMAIL DE SOPORTE]"],
            ["Horario", "[HORARIO DE ATENCIÓN]"],
            ["Información legal", "Información legal en actualización"],
          ].map(([title, text]) => (
            <div key={title} className="rounded-2xl border border-neutral-200 bg-neutral-50 p-5">
              <h2 className="font-semibold text-neutral-900">{title}</h2>
              <p className="mt-2 text-sm text-neutral-600">{text}</p>
            </div>
          ))}
        </div>
        <div className="mt-8">
          <Link href="/" className="inline-flex rounded-xl bg-black px-5 py-3 text-sm font-semibold text-white">Volver a la tienda</Link>
        </div>
      </div>
    </main>
  );
}

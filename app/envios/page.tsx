import Link from "next/link";

export const metadata = {
  title: "Envíos | AVG Connects",
  description: "Conocé los tiempos, seguimiento y proceso de entrega de AVG Connects.",
};

export default function EnviosPage() {
  return (
    <main className="min-h-screen bg-neutral-50 px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl rounded-3xl border border-neutral-200 bg-white p-8 shadow-sm sm:p-10">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-neutral-500">Envíos</p>
        <h1 className="mt-4 text-3xl font-semibold sm:text-4xl">Envíos rápidos, seguimiento claro y entrega confiable.</h1>
        <p className="mt-5 text-lg leading-8 text-neutral-600">
          Todos los pedidos se procesan con control y seguimiento para que el cliente sepa en qué etapa se encuentra su compra.
        </p>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {[
            ["Procesamiento", "Confirmamos el pedido en las primeras 24 horas."],
            ["Seguimiento", "El cliente recibe información para monitorear el envío."],
            ["Entrega", "Los tiempos dependen del destino y del proveedor seleccionado."],
          ].map(([title, text]) => (
            <div key={title} className="rounded-2xl border border-neutral-200 bg-neutral-50 p-5">
              <h2 className="font-semibold text-neutral-900">{title}</h2>
              <p className="mt-2 text-sm text-neutral-600">{text}</p>
            </div>
          ))}
        </div>
        <div className="mt-8">
          <Link href="/contacto" className="inline-flex rounded-xl bg-black px-5 py-3 text-sm font-semibold text-white">Consultar por un pedido</Link>
        </div>
      </div>
    </main>
  );
}

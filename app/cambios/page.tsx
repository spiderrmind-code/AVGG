import Link from "next/link";

export const metadata = {
  title: "Cambios y devoluciones | AVG Connects",
  description: "Conocé la política de cambios y devoluciones de AVG Connects.",
};

export default function CambiosPage() {
  return (
    <main className="min-h-screen bg-neutral-50 px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl rounded-3xl border border-neutral-200 bg-white p-8 shadow-sm sm:p-10">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-neutral-500">Cambios</p>
        <h1 className="mt-4 text-3xl font-semibold sm:text-4xl">Política simple para que cada compra se sienta segura.</h1>
        <p className="mt-5 text-lg leading-8 text-neutral-600">
          Si el producto presenta un problema de calidad o se entrega en mal estado, contactanos y revisaremos la situación con prioridad.
        </p>
        <div className="mt-8 rounded-2xl border border-neutral-200 bg-neutral-50 p-6 text-sm text-neutral-700">
          <ul className="space-y-3">
            <li>• Los cambios y devoluciones se evalúan según el estado del producto y la causa del reclamo.</li>
            <li>• Se solicita evidencia de envío, fotos y datos del pedido.</li>
            <li>• El equipo de AVG Connects responderá en el menor tiempo posible para resolver la situación.</li>
          </ul>
        </div>
        <div className="mt-8">
          <Link href="/contacto" className="inline-flex rounded-xl bg-black px-5 py-3 text-sm font-semibold text-white">Hablar con soporte</Link>
        </div>
      </div>
    </main>
  );
}

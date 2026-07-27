import Link from "next/link";

export const metadata = {
  title: "Documentación dropshipping | AVG Connects",
  description: "Guía interna para operar catálogo, márgenes y proveedores en AVG Connects.",
};

export default function DropshippingDocsPage() {
  return (
    <main className="min-h-screen bg-neutral-50 px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl rounded-3xl border border-neutral-200 bg-white p-8 shadow-sm sm:p-10">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-neutral-500">Dropshipping</p>
        <h1 className="mt-4 text-3xl font-semibold sm:text-4xl">Estructura operativa para crecer con proveedores.</h1>
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {[
            ["Agregar producto", "Crear ficha con nombre comercial, precio, descripción, beneficios, imágenes y proveedor."],
            ["Calcular precio", "Aplicar margen sobre costo proveedor y sumar costo de envío estimado."],
            ["Procesar pedido", "Confirmar pago, derivar a proveedor, monitorear entrega y comunicar estado al cliente."],
            ["Proveedores", "AliExpress y proveedores locales pueden organizarse con un mismo modelo de ficha."],
          ].map(([title, text]) => (
            <div key={title} className="rounded-2xl border border-neutral-200 bg-neutral-50 p-5">
              <h2 className="font-semibold text-neutral-900">{title}</h2>
              <p className="mt-2 text-sm text-neutral-600">{text}</p>
            </div>
          ))}
        </div>
        <div className="mt-8">
          <Link href="/admin" className="inline-flex rounded-xl bg-black px-5 py-3 text-sm font-semibold text-white">Ir al panel admin</Link>
        </div>
      </div>
    </main>
  );
}

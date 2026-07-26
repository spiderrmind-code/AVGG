import Link from "next/link";

export const metadata = {
  title: "Nosotros | AVG Connects",
  description: "Conocé la historia y la propuesta de AVG Connects para vender con confianza.",
};

export default function NosotrosPage() {
  return (
    <main className="min-h-screen bg-neutral-50 px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl rounded-3xl border border-neutral-200 bg-white p-8 shadow-sm sm:p-10">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-neutral-500">Nosotros</p>
        <h1 className="mt-4 text-3xl font-semibold sm:text-4xl">AVG Connects nació para hacer que comprar online sea simple, confiable y premium.</h1>
        <p className="mt-5 text-lg leading-8 text-neutral-600">
          Trabajamos con una propuesta clara: ofrecer productos seleccionados, una experiencia de compra fluida y un servicio que acompañe al cliente desde la primera visita hasta la entrega.
        </p>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {[
            ["Selección curada", "Elegimos productos que combinan valor, diseño y utilidad real."],
            ["Compra segura", "Checkout simple, pagos protegidos y seguimiento claro."],
            ["Soporte real", "Respondemos consultas y acompañamos cada compra con atención humana."],
          ].map(([title, text]) => (
            <div key={title} className="rounded-2xl border border-neutral-200 bg-neutral-50 p-5">
              <h2 className="font-semibold text-neutral-900">{title}</h2>
              <p className="mt-2 text-sm text-neutral-600">{text}</p>
            </div>
          ))}
        </div>
        <div className="mt-8">
          <Link href="/contacto" className="inline-flex rounded-xl bg-black px-5 py-3 text-sm font-semibold text-white">Contactanos</Link>
        </div>
      </div>
    </main>
  );
}

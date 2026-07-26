import Link from "next/link";

export const metadata = {
  title: "Preguntas frecuentes | AVG Connects",
  description: "Respuestas rápidas sobre pagos, envíos, cambios y compras en AVG Connects.",
};

export default function FaqPage() {
  const faq = [
    {
      question: "¿Cuánto tardan los envíos?",
      answer: "Depende del proveedor y la zona de entrega. En general el procesamiento es rápido y el seguimiento se comparte al confirmar el pedido.",
    },
    {
      question: "¿Puedo pagar con Mercado Pago?",
      answer: "Sí. La tienda procesa pagos con Mercado Pago para ofrecer una experiencia más simple y segura.",
    },
    {
      question: "¿Se pueden hacer cambios?",
      answer: "Sí, evaluamos cada caso de forma personalizada para garantizar la mejor experiencia posible.",
    },
  ];

  return (
    <main className="min-h-screen bg-neutral-50 px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl rounded-3xl border border-neutral-200 bg-white p-8 shadow-sm sm:p-10">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-neutral-500">FAQ</p>
        <h1 className="mt-4 text-3xl font-semibold sm:text-4xl">Preguntas frecuentes para vender con mayor confianza.</h1>
        <div className="mt-8 space-y-4">
          {faq.map((item) => (
            <div key={item.question} className="rounded-2xl border border-neutral-200 bg-neutral-50 p-5">
              <h2 className="font-semibold text-neutral-900">{item.question}</h2>
              <p className="mt-2 text-sm leading-7 text-neutral-600">{item.answer}</p>
            </div>
          ))}
        </div>
        <div className="mt-8">
          <Link href="/contacto" className="inline-flex rounded-xl bg-black px-5 py-3 text-sm font-semibold text-white">Necesito ayuda</Link>
        </div>
      </div>
    </main>
  );
}

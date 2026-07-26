export default function BenefitsSection() {
  const benefits = [
    { title: "Envío rápido", description: "Despacho en 24 hs y seguimiento en tiempo real." },
    { title: "Garantía", description: "Protegemos cada compra con una garantía real." },
    { title: "Pagos seguros", description: "Procesamos pagos con tecnología segura y protegida." },
  ];

  return (
    <section className="mx-auto mt-12 grid max-w-7xl gap-4 px-4 sm:px-6 lg:grid-cols-3 lg:px-8">
      {benefits.map((benefit) => (
        <div key={benefit.title} className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
          <h3 className="font-semibold text-neutral-900">{benefit.title}</h3>
          <p className="mt-2 text-sm text-neutral-600">{benefit.description}</p>
        </div>
      ))}
    </section>
  );
}

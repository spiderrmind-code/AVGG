export default function BenefitsSection() {
  const benefits = [
    { title: "Envío rápido", description: "Despacho veloz y seguimiento claro desde el primer momento." },
    { title: "Garantía", description: "Protegemos cada compra con una experiencia de soporte real." },
    { title: "Pagos seguros", description: "Procesos protegidos con tecnología moderna y confianza." },
  ];

  return (
    <section className="mx-auto mt-12 grid max-w-7xl gap-4 px-4 sm:px-6 lg:grid-cols-3 lg:px-8">
      {benefits.map((benefit) => (
        <div key={benefit.title} className="rounded-[1.5rem] border border-white/70 bg-white/70 p-6 shadow-[0_10px_40px_rgba(0,0,0,0.04)] backdrop-blur-xl">
          <h3 className="font-semibold text-neutral-950">{benefit.title}</h3>
          <p className="mt-2 text-sm leading-6 text-neutral-600">{benefit.description}</p>
        </div>
      ))}
    </section>
  );
}

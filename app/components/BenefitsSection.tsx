export default function BenefitsSection() {
  const benefits = [
    { title: "Envío rápido", description: "Despacho veloz y seguimiento claro desde el primer momento." },
    { title: "Garantía", description: "Protegemos cada compra con una experiencia de soporte real." },
    { title: "Pagos seguros", description: "Procesos protegidos con tecnología moderna y confianza." },
  ];

  return (
    <section className="ui-shell mb-4 grid gap-5 pb-8 lg:grid-cols-3">
      {benefits.map((benefit) => (
        <div key={benefit.title} className="ui-card ui-card-hover p-6 sm:p-7">
          <div className="mb-5 h-1.5 w-10 rounded-full bg-[color:var(--color-accent)]" />
          <h3 className="font-semibold tracking-[-0.02em] text-neutral-950 dark:text-white">{benefit.title}</h3>
          <p className="mt-2 text-sm leading-6 text-neutral-600 dark:text-zinc-300">{benefit.description}</p>
        </div>
      ))}
    </section>
  );
}

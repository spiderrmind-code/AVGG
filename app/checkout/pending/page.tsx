import Link from "next/link";

export default function CheckoutPendingPage() {
  return (
    <main className="min-h-screen bg-neutral-50 px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl rounded-3xl border border-neutral-200 bg-white p-8 text-center shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-neutral-500">Pago pendiente</p>
        <h1 className="mt-4 text-3xl font-semibold">Tu pago está en revisión</h1>
        <p className="mt-4 text-neutral-600">Te avisaremos cuando el pago sea confirmado.</p>
        <Link href="/" className="mt-8 inline-flex rounded-xl bg-black px-5 py-3 text-sm font-semibold text-white">Volver al inicio</Link>
      </div>
    </main>
  );
}

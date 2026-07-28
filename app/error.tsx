"use client";

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <main className="min-h-screen px-4 py-16"><section className="mx-auto max-w-3xl rounded-3xl bg-white p-8 text-center shadow-sm"><h1 className="text-3xl font-semibold">No pudimos cargar esta página</h1><p className="mt-3 text-neutral-600">Intentá nuevamente en unos instantes.</p><button className="mt-6 rounded-full bg-neutral-950 px-5 py-3 font-semibold text-white" onClick={reset}>Reintentar</button></section></main>;
}

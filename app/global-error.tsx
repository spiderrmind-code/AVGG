"use client";

import Link from "next/link";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <html lang="es"><body><main className="mx-auto flex min-h-screen max-w-3xl items-center px-4"><section><h1 className="text-3xl font-semibold">Ocurrió un problema inesperado</h1><p className="mt-3 text-neutral-600">Intentá nuevamente en unos instantes.</p><div className="mt-6 flex gap-3"><button className="rounded-full bg-neutral-950 px-5 py-3 font-semibold text-white" onClick={reset}>Reintentar</button><Link className="rounded-full border border-neutral-300 px-5 py-3 font-semibold" href="/">Volver al inicio</Link></div></section></main></body></html>;
}

"use client";

import Link from "next/link";

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="ui-page flex items-center">
      <section className="ui-surface mx-auto max-w-3xl p-8 text-center">
        <h1 className="ui-title">No pudimos cargar esta página</h1>
        <p className="ui-copy mx-auto">Intentá nuevamente en unos instantes.</p>
        <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
          <button type="button" className="ui-button-primary" onClick={reset}>Reintentar</button>
          <Link className="ui-button-secondary" href="/">Volver al inicio</Link>
        </div>
      </section>
    </main>
  );
}

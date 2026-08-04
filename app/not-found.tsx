import Link from "next/link";

export default function NotFound() {
  return (
    <main className="ui-page flex items-center">
      <section className="ui-surface mx-auto max-w-3xl p-8 text-center">
        <p className="ui-eyebrow">404</p>
        <h1 className="ui-title">Página no encontrada</h1>
        <p className="ui-copy mx-auto">La página que buscás no existe o fue movida.</p>
        <Link className="ui-button-primary mt-6" href="/">Volver a la tienda</Link>
      </section>
    </main>
  );
}

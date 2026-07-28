import Link from "next/link";

export default function NotFound() {
  return <main className="min-h-screen px-4 py-16"><section className="mx-auto max-w-3xl rounded-3xl bg-white p-8 text-center shadow-sm"><h1 className="text-3xl font-semibold">Página no encontrada</h1><p className="mt-3 text-neutral-600">La página que buscás no existe o fue movida.</p><Link className="mt-6 inline-flex rounded-full bg-neutral-950 px-5 py-3 font-semibold text-white" href="/">Volver a la tienda</Link></section></main>;
}

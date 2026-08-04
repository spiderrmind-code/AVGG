import { Suspense } from "react";
import PendingContent from "./PendingContent";

function PendingFallback() {
  return <main className="min-h-screen px-4 py-16"><div className="ui-surface mx-auto max-w-3xl p-8 text-center"><p className="text-neutral-600">Cargando información del pago...</p></div></main>;
}

export default function CheckoutPendingPage() {
  return <Suspense fallback={<PendingFallback />}><PendingContent /></Suspense>;
}

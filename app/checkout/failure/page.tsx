import { Suspense } from "react";
import FailureContent from "./FailureContent";

function FailureFallback() {
  return <main className="min-h-screen px-4 py-16"><div className="ui-surface mx-auto max-w-3xl p-8 text-center"><p className="text-neutral-600">Cargando información del pago...</p></div></main>;
}

export default function CheckoutFailurePage() {
  return <Suspense fallback={<FailureFallback />}><FailureContent /></Suspense>;
}

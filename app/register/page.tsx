"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { validateRegisterInput, validateStudioRegisterInput } from "@/lib/auth-validation";

export default function RegisterPage() {
  const [form, setForm] = useState({ name: "", lastName: "", email: "", phone: "", password: "", confirmPassword: "" });
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [privacyConsent, setPrivacyConsent] = useState(false);
  const [googleAvailable, setGoogleAvailable] = useState(false);
  const router = useRouter();
  const studioDeployment = process.env.NEXT_PUBLIC_STUDIO_DEPLOYMENT?.trim().toLowerCase() === "true";
  const collectionEnabled = process.env.NEXT_PUBLIC_STUDIO_ACCOUNT_PRIVACY_APPROVED?.trim().toLowerCase() === "true"
    && process.env.NEXT_PUBLIC_STUDIO_ACCOUNT_RETENTION_POLICY_APPROVED?.trim().toLowerCase() === "true"
    && process.env.NEXT_PUBLIC_STUDIO_ACCOUNT_DATA_COLLECTION_ENABLED?.trim().toLowerCase() === "true";

  useEffect(() => {
    if (!collectionEnabled) return;
    void fetch("/api/auth/providers")
      .then((response) => response.json())
      .then((providers: Record<string, { id: string }>) => setGoogleAvailable(Boolean(providers.google)))
      .catch(() => setGoogleAvailable(false));
  }, [collectionEnabled]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage("");
    const website = studioDeployment ? new FormData(e.currentTarget).get("website") : undefined;

    const validation = process.env.NEXT_PUBLIC_STUDIO_DEPLOYMENT?.trim().toLowerCase() === "true"
      ? validateStudioRegisterInput(form)
      : validateRegisterInput(form);
    if (!validation.valid) {
      setMessage(validation.errors[0]);
      setIsSubmitting(false);
      return;
    }
    if (!privacyConsent) {
      setMessage("Debés aceptar la política de privacidad.");
      setIsSubmitting(false);
      return;
    }

    try {
      const res = await fetch("/api/register", {
        method: "POST",
        body: JSON.stringify({ ...form, privacyConsent, ...(studioDeployment ? { website } : {}) }),
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();
      setMessage(data.message ?? "Registro completado");
      if (res.ok) router.push("/login");
    } catch {
      setMessage("No se pudo crear la cuenta. Revisá tu conexión e intentá nuevamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  async function registerWithGoogle() {
    if (!privacyConsent) {
      setMessage("Debés aceptar la política de privacidad.");
      return;
    }

    setIsSubmitting(true);
    setMessage("");
    try {
      const response = await fetch("/api/register/google-consent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ privacyConsent: true }),
      });
      const data = await response.json();
      if (!response.ok) {
        setMessage(data.message ?? "No se pudo iniciar el registro con Google.");
        return;
      }

      const result = await signIn("google", { callbackUrl: "/mi-cuenta", redirect: false });
      if (result?.url) {
        window.location.assign(result.url);
        return;
      }
      setMessage("No se pudo iniciar el registro con Google. Intentá nuevamente.");
    } catch {
      setMessage("No se pudo iniciar el registro con Google. Revisá tu conexión e intentá nuevamente.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="avg-auth-page min-h-screen px-4 py-16 sm:px-6 lg:px-8">
      <div className="ui-surface mx-auto max-w-3xl p-8 sm:p-10">
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-neutral-500 dark:text-zinc-400">13 Studio Tattoo</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-[-0.02em] text-neutral-950 dark:text-white">Crear cuenta de cliente</h1>
        <p className="mt-3 text-neutral-600 dark:text-zinc-300">La cuenta es opcional: podés pedir turno como invitado. Si iniciás sesión, vas a poder consultar tus solicitudes.</p>
        {!collectionEnabled ? <p className="mt-6 rounded-xl border border-amber-500/30 p-4 text-sm" role="status">El registro de cuentas está pausado mientras se finalizan las verificaciones de privacidad. Consultá la <Link href="/politica-de-privacidad" className="underline" target="_blank" rel="noopener noreferrer">política de privacidad</Link>.</p> : null}
        <p className="mt-4 text-sm text-neutral-600">¿Ya tenés cuenta? <Link href="/login" className="font-semibold text-neutral-950 underline dark:text-white">Iniciar sesión</Link></p>
        {collectionEnabled ? <>
        <form onSubmit={handleSubmit} className="mt-8 grid gap-4 md:grid-cols-2">
          {studioDeployment ? <label className="absolute h-px w-px overflow-hidden opacity-0" aria-hidden="true">Dejar vacío<input name="website" type="text" tabIndex={-1} autoComplete="off" /></label> : null}
          <div>
            <label className="mb-2 block text-sm font-medium text-neutral-700">Nombre</label>
            <input autoComplete="given-name" maxLength={80} className="premium-input" placeholder="Nombre" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-neutral-700">Apellido</label>
            <input autoComplete="family-name" maxLength={80} className="premium-input" placeholder="Apellido" value={form.lastName} onChange={(event) => setForm({ ...form, lastName: event.target.value })} required />
          </div>
          <div className="md:col-span-2">
            <label className="mb-2 block text-sm font-medium text-neutral-700">Email</label>
            <input autoComplete="email" type="email" maxLength={254} className="premium-input" placeholder="Email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} required />
          </div>
          <label className="md:col-span-2 flex items-start gap-3 text-sm text-neutral-700">
            <input type="checkbox" checked={privacyConsent} onChange={(event) => setPrivacyConsent(event.target.checked)} />
            <span>Leí y acepto la <Link href="/politica-de-privacidad" className="underline" target="_blank" rel="noopener noreferrer">política de privacidad</Link>.</span>
          </label>
          {googleAvailable ? <button
            type="button"
            disabled={isSubmitting || !privacyConsent}
            onClick={() => void registerWithGoogle()}
            className="md:col-span-2 w-full rounded-full border border-neutral-300 px-4 py-3 font-semibold disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting ? "Conectando con Google..." : "Continuar con Google"}
          </button> : null}
          {googleAvailable ? <p className="md:col-span-2 text-center text-sm text-neutral-500">O creá tu cuenta con email y contraseña.</p> : null}
          <div className="md:col-span-2">
            <label className="mb-2 block text-sm font-medium text-neutral-700">Teléfono</label>
            <input autoComplete="tel" type="tel" maxLength={40} className="premium-input" placeholder="Teléfono" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} />
          </div>
          <div className="md:col-span-2">
            <label className="mb-2 block text-sm font-medium text-neutral-700">Contraseña</label>
            <input autoComplete="new-password" type="password" minLength={studioDeployment ? 12 : 8} maxLength={128} className="premium-input" placeholder="Contraseña" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} required />
          </div>
          <div className="md:col-span-2">
            <label className="mb-2 block text-sm font-medium text-neutral-700">Confirmar contraseña</label>
            <input autoComplete="new-password" type="password" minLength={studioDeployment ? 12 : 8} maxLength={128} className="premium-input" placeholder="Confirmar contraseña" value={form.confirmPassword} onChange={(event) => setForm({ ...form, confirmPassword: event.target.value })} required />
          </div>
          <div className="md:col-span-2">
            <button type="submit" disabled={isSubmitting} className="ui-button-primary w-full py-3">{isSubmitting ? "Creando cuenta..." : "Crear cuenta"}</button>
            {message ? <p role="status" className="mt-3 rounded-[1rem] border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm text-neutral-700">{message}</p> : null}
            <p className="mt-3 text-sm text-neutral-600">
              ¿Ya tenés cuenta? <Link href="/login" className="font-semibold text-neutral-950 dark:text-white">Iniciar sesión</Link>
            </p>
          </div>
        </form>
        </> : null}
      </div>
    </main>
  );
}

"use client";

import { signIn } from "next-auth/react";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [googleAvailable, setGoogleAvailable] = useState(false);
  const router = useRouter();

  useEffect(() => {
    void fetch("/api/auth/providers")
      .then((response) => response.json())
      .then((providers: Record<string, { id: string }>) => setGoogleAvailable(Boolean(providers.google)))
      .catch(() => setGoogleAvailable(false));
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setMessage("");
    if (!email.trim() || !password) {
      setMessage("Ingresá tu email y contraseña para continuar");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await signIn("credentials", {
        redirect: false,
        email,
        password,
      });
      if (res?.ok) {
        const sessionResponse = await fetch("/api/auth/session", { cache: "no-store" });
        if (!sessionResponse.ok) throw new Error("No se pudo consultar la sesión.");
        const session = await sessionResponse.json();
        router.push(session?.user?.role === "admin" ? "/admin/turnos" : "/mi-cuenta");
        router.refresh();
      } else {
        setMessage("Usuario o contraseña incorrecta");
      }
    } catch {
      setMessage("No se pudo iniciar sesión. Revisá tu conexión e intentá nuevamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="studio-admin-login min-h-screen px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-xl">
        <div className="studio-admin-login-panel">
          <p className="studio-kicker"><span /> 13 Studio Tattoo</p>
          <h1>Ingresar</h1>
          <p>Accedé a tu cuenta de cliente o al panel administrativo autorizado.</p>
          <p>Si todavía no tenés cuenta, podés registrarte con Google o con email y contraseña.</p>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium">Email</label>
              <input type="email" placeholder="tu@email.com" value={email} onChange={(event) => setEmail(event.target.value)} required className="premium-input mt-2 h-12" />
            </div>
            <div>
              <label className="text-sm font-medium">Contraseña</label>
              <input type="password" placeholder="Ingresá tu contraseña" value={password} onChange={(event) => setPassword(event.target.value)} required className="premium-input mt-2 h-12" />
            </div>
            <button type="submit" disabled={isSubmitting} className="studio-primary w-full">{isSubmitting ? "Ingresando..." : "Ingresar"}</button>
            {googleAvailable ? <button type="button" onClick={() => void signIn("google", { callbackUrl: "/mi-cuenta" })} className="w-full rounded-full border border-neutral-300 px-4 py-3 font-semibold">Continuar con Google</button> : null}
            {message ? <p className="rounded-[1rem] border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-600">{message}</p> : null}
            <p className="text-sm">¿Sos nuevo? <Link href="/register" className="underline">Crear cuenta opcional</Link></p>
          </form>
        </div>
      </div>
    </main>
  );
}

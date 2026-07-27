"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setMessage("");
    if (!email.trim() || !password) {
      setMessage("Ingresá tu email y contraseña para continuar");
      return;
    }

    setIsSubmitting(true);
    const res = await signIn("credentials", {
      redirect: false,
      email,
      password,
    });
    if (res?.ok) {
      router.push("/account");
    } else {
      setMessage("Usuario o contraseña incorrecta");
    }
    setIsSubmitting(false);
  };

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(255,47,146,0.12),_transparent_35%),linear-gradient(180deg,_#f7f2ea_0%,_#efe7dd_100%)] px-4 py-16 sm:px-6 lg:px-8 dark:bg-[radial-gradient(circle_at_top_left,_rgba(255,47,146,0.16),_transparent_30%),linear-gradient(180deg,_#07080d_0%,_#0d1018_100%)]">
      <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="rounded-[2.2rem] border border-white/70 bg-white/75 p-8 shadow-[0_24px_90px_rgba(0,0,0,0.08)] backdrop-blur-2xl sm:p-10 dark:border-white/10 dark:bg-zinc-900/70 dark:shadow-[0_24px_90px_rgba(0,0,0,0.3)]">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-neutral-500 dark:text-zinc-400">Acceso seguro</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-[-0.02em] text-neutral-950 sm:text-4xl dark:text-white">Ingresá a tu espacio de compras.</h1>
          <p className="mt-4 text-base leading-7 text-neutral-600 dark:text-zinc-300">Una experiencia simple, protegida y pensada para que cada sesión se sienta confiable desde el primer clic.</p>
          <div className="mt-8 space-y-3 text-sm text-neutral-700 dark:text-zinc-300">
            <div className="rounded-[1.2rem] border border-black/10 bg-white/80 p-3 dark:border-white/10 dark:bg-white/10">Gestión centralizada de pedidos y datos.</div>
            <div className="rounded-[1.2rem] border border-black/10 bg-white/80 p-3 dark:border-white/10 dark:bg-white/10">Compra más rápida con tu perfil listo.</div>
            <div className="rounded-[1.2rem] border border-black/10 bg-white/80 p-3 dark:border-white/10 dark:bg-white/10">Seguridad y soporte con un solo acceso.</div>
          </div>
        </div>

        <div className="rounded-[2.2rem] border border-white/70 bg-white/80 p-8 shadow-[0_24px_90px_rgba(0,0,0,0.08)] backdrop-blur-xl sm:p-10 dark:border-white/10 dark:bg-zinc-900/70 dark:shadow-[0_24px_90px_rgba(0,0,0,0.3)]">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium text-neutral-700">Email</label>
              <input type="email" placeholder="tu@email.com" value={email} onChange={(event) => setEmail(event.target.value)} required className="premium-input mt-2" />
            </div>
            <div>
              <label className="text-sm font-medium text-neutral-700">Contraseña</label>
              <input type="password" placeholder="Ingresá tu contraseña" value={password} onChange={(event) => setPassword(event.target.value)} required className="premium-input mt-2" />
            </div>
            <button type="submit" disabled={isSubmitting} className="w-full rounded-full bg-neutral-950 px-4 py-3.5 text-sm font-semibold text-white shadow-[0_16px_45px_rgba(0,0,0,0.16)] transition hover:-translate-y-0.5 hover:bg-neutral-800 active:scale-[0.98] disabled:opacity-60 dark:bg-white dark:text-neutral-950 dark:hover:bg-zinc-100">{isSubmitting ? "Ingresando..." : "Ingresar"}</button>
            {message ? <p className="rounded-[1rem] border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-600">{message}</p> : null}
            <p className="text-sm text-neutral-600">
              ¿No tenés cuenta? <Link href="/register" className="font-semibold text-neutral-950 dark:text-white">Crear cuenta</Link>
            </p>
          </form>
        </div>
      </div>
    </main>
  );
}

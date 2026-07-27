"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
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
  };

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(200,169,107,0.16),_transparent_35%),linear-gradient(180deg,_#f7f3ea_0%,_#f1ece4_100%)] px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="rounded-[2.2rem] border border-white/70 bg-white/75 p-8 shadow-[0_24px_90px_rgba(0,0,0,0.08)] backdrop-blur-2xl sm:p-10">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-neutral-500">Acceso seguro</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-[-0.02em] text-neutral-950 sm:text-4xl">Ingresá a tu espacio de compras.</h1>
          <p className="mt-4 text-base leading-7 text-neutral-600">Una experiencia simple, protegida y pensada para que cada sesión se sienta confiable desde el primer clic.</p>
          <div className="mt-8 space-y-3 text-sm text-neutral-700">
            <div className="rounded-[1.2rem] border border-black/10 bg-white/80 p-3">Gestión centralizada de pedidos y datos.</div>
            <div className="rounded-[1.2rem] border border-black/10 bg-white/80 p-3">Compra más rápida con tu perfil listo.</div>
            <div className="rounded-[1.2rem] border border-black/10 bg-white/80 p-3">Seguridad y soporte con un solo acceso.</div>
          </div>
        </div>

        <div className="rounded-[2.2rem] border border-white/70 bg-white/80 p-8 shadow-[0_24px_90px_rgba(0,0,0,0.08)] backdrop-blur-xl sm:p-10">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium text-neutral-700">Email</label>
              <input type="email" placeholder="tu@email.com" value={email} onChange={(event) => setEmail(event.target.value)} required className="premium-input mt-2" />
            </div>
            <div>
              <label className="text-sm font-medium text-neutral-700">Contraseña</label>
              <input type="password" placeholder="Ingresá tu contraseña" value={password} onChange={(event) => setPassword(event.target.value)} required className="premium-input mt-2" />
            </div>
            <button type="submit" className="w-full rounded-full bg-neutral-950 px-4 py-3.5 text-sm font-semibold text-white transition hover:bg-neutral-800 active:scale-[0.98]">Ingresar</button>
            {message ? <p className="rounded-[1rem] border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-600">{message}</p> : null}
            <p className="text-sm text-neutral-600">
              ¿No tenés cuenta? <Link href="/register" className="font-semibold text-neutral-950">Crear cuenta</Link>
            </p>
          </form>
        </div>
      </div>
    </main>
  );
}

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
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(0,0,0,0.03),_transparent_45%)] px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-xl rounded-[2rem] border border-white/70 bg-white/80 p-8 shadow-[0_24px_80px_rgba(0,0,0,0.08)] backdrop-blur-xl">
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-neutral-500">Ingresar</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-[-0.02em] text-neutral-950">Iniciá sesión en AVG Connects</h1>
        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <input type="email" placeholder="Email" value={email} onChange={(event) => setEmail(event.target.value)} required className="w-full rounded-2xl border border-neutral-200 bg-white/80 px-3 py-3 text-sm outline-none transition focus:border-neutral-300 focus:ring-2 focus:ring-neutral-200" />
          <input type="password" placeholder="Contraseña" value={password} onChange={(event) => setPassword(event.target.value)} required className="w-full rounded-2xl border border-neutral-200 bg-white/80 px-3 py-3 text-sm outline-none transition focus:border-neutral-300 focus:ring-2 focus:ring-neutral-200" />
          <button type="submit" className="w-full rounded-full bg-neutral-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-neutral-800">Ingresar</button>
          {message ? <p className="text-sm text-neutral-600">{message}</p> : null}
          <p className="text-sm text-neutral-600">
            ¿No tenés cuenta? <Link href="/register" className="font-semibold text-neutral-950">Crear cuenta</Link>
          </p>
        </form>
      </div>
    </main>
  );
}

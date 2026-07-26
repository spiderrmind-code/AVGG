"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
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
    <main className="min-h-screen bg-neutral-50 px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-xl rounded-3xl border border-neutral-200 bg-white p-8 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-neutral-500">Ingresar</p>
        <h1 className="mt-2 text-3xl font-semibold">Iniciá sesión en AVG Connects</h1>
        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <input type="email" placeholder="Email" value={email} onChange={(event) => setEmail(event.target.value)} required className="w-full rounded-xl border border-neutral-300 px-3 py-2" />
          <input type="password" placeholder="Contraseña" value={password} onChange={(event) => setPassword(event.target.value)} required className="w-full rounded-xl border border-neutral-300 px-3 py-2" />
          <button type="submit" className="w-full rounded-xl bg-black px-4 py-3 text-sm font-semibold text-white">Ingresar</button>
          {message ? <p className="text-sm text-neutral-600">{message}</p> : null}
        </form>
      </div>
    </main>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
  const [form, setForm] = useState({ name: "", lastName: "", email: "", phone: "", password: "" });
  const [message, setMessage] = useState("");
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const res = await fetch("/api/register", {
      method: "POST",
      body: JSON.stringify(form),
      headers: { "Content-Type": "application/json" },
    });
    const data = await res.json();
    setMessage(data.message ?? "Registro completado");
    if (res.ok) {
      router.push("/login");
    }
  };

  return (
    <main className="min-h-screen bg-neutral-50 px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl rounded-3xl border border-neutral-200 bg-white p-8 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-neutral-500">Registro</p>
        <h1 className="mt-2 text-3xl font-semibold">Crear tu cuenta en AVG Connects</h1>
        <p className="mt-3 text-neutral-600">Registrate para guardar tu carrito, tus pedidos y tus datos de entrega.</p>
        <form onSubmit={handleSubmit} className="mt-8 grid gap-4 md:grid-cols-2">
          <input className="w-full rounded-xl border border-neutral-300 px-3 py-2" placeholder="Nombre" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required />
          <input className="w-full rounded-xl border border-neutral-300 px-3 py-2" placeholder="Apellido" value={form.lastName} onChange={(event) => setForm({ ...form, lastName: event.target.value })} required />
          <input type="email" className="w-full rounded-xl border border-neutral-300 px-3 py-2 md:col-span-2" placeholder="Email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} required />
          <input className="w-full rounded-xl border border-neutral-300 px-3 py-2 md:col-span-2" placeholder="Teléfono" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} />
          <input type="password" className="w-full rounded-xl border border-neutral-300 px-3 py-2 md:col-span-2" placeholder="Contraseña" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} required />
          <div className="md:col-span-2">
            <button type="submit" className="w-full rounded-xl bg-black px-4 py-3 text-sm font-semibold text-white">Crear cuenta</button>
            {message ? <p className="mt-3 text-sm text-neutral-600">{message}</p> : null}
          </div>
        </form>
      </div>
    </main>
  );
}

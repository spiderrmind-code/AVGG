"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
  const [form, setForm] = useState({ name: "", lastName: "", email: "", phone: "", password: "", confirmPassword: "" });
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage("");
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
    setIsSubmitting(false);
  };

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(0,0,0,0.03),_transparent_45%)] px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl rounded-[2rem] border border-white/70 bg-white/80 p-8 shadow-[0_24px_80px_rgba(0,0,0,0.08)] backdrop-blur-xl">
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-neutral-500">Registro</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-[-0.02em] text-neutral-950">Crear tu cuenta en AVG Connects</h1>
        <p className="mt-3 text-neutral-600">Registrate para guardar tu carrito, tus pedidos y tus datos de entrega.</p>
        <form onSubmit={handleSubmit} className="mt-8 grid gap-4 md:grid-cols-2">
          <input className="w-full rounded-2xl border border-neutral-200 bg-white/80 px-3 py-3 text-sm outline-none transition focus:border-neutral-300 focus:ring-2 focus:ring-neutral-200" placeholder="Nombre" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required />
          <input className="w-full rounded-2xl border border-neutral-200 bg-white/80 px-3 py-3 text-sm outline-none transition focus:border-neutral-300 focus:ring-2 focus:ring-neutral-200" placeholder="Apellido" value={form.lastName} onChange={(event) => setForm({ ...form, lastName: event.target.value })} required />
          <input type="email" className="w-full rounded-2xl border border-neutral-200 bg-white/80 px-3 py-3 text-sm outline-none transition focus:border-neutral-300 focus:ring-2 focus:ring-neutral-200 md:col-span-2" placeholder="Email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} required />
          <input className="w-full rounded-2xl border border-neutral-200 bg-white/80 px-3 py-3 text-sm outline-none transition focus:border-neutral-300 focus:ring-2 focus:ring-neutral-200 md:col-span-2" placeholder="Teléfono" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} />
          <input type="password" className="w-full rounded-2xl border border-neutral-200 bg-white/80 px-3 py-3 text-sm outline-none transition focus:border-neutral-300 focus:ring-2 focus:ring-neutral-200 md:col-span-2" placeholder="Contraseña" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} required />
          <input type="password" className="w-full rounded-2xl border border-neutral-200 bg-white/80 px-3 py-3 text-sm outline-none transition focus:border-neutral-300 focus:ring-2 focus:ring-neutral-200 md:col-span-2" placeholder="Confirmar contraseña" value={form.confirmPassword} onChange={(event) => setForm({ ...form, confirmPassword: event.target.value })} required />
          <div className="md:col-span-2">
            <button type="submit" disabled={isSubmitting} className="w-full rounded-full bg-neutral-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-neutral-800 disabled:opacity-60">{isSubmitting ? "Creando cuenta..." : "Crear cuenta"}</button>
            {message ? <p className="mt-3 text-sm text-neutral-600">{message}</p> : null}
            <p className="mt-3 text-sm text-neutral-600">
              ¿Ya tenés cuenta? <Link href="/login" className="font-semibold text-neutral-950">Iniciar sesión</Link>
            </p>
          </div>
        </form>
      </div>
    </main>
  );
}

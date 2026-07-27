"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { validateRegisterInput } from "@/lib/auth-validation";

export default function RegisterPage() {
  const [form, setForm] = useState({ name: "", lastName: "", email: "", phone: "", password: "", confirmPassword: "" });
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage("");

    const validation = validateRegisterInput(form);
    if (!validation.valid) {
      setMessage(validation.errors[0]);
      setIsSubmitting(false);
      return;
    }

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
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(255,47,146,0.12),_transparent_35%),linear-gradient(180deg,_#f7f2ea_0%,_#efe7dd_100%)] px-4 py-16 sm:px-6 lg:px-8 dark:bg-[radial-gradient(circle_at_top_left,_rgba(255,47,146,0.16),_transparent_30%),linear-gradient(180deg,_#07080d_0%,_#0d1018_100%)]">
      <div className="mx-auto max-w-3xl rounded-[2.2rem] border border-white/70 bg-white/80 p-8 shadow-[0_24px_90px_rgba(0,0,0,0.08)] backdrop-blur-xl sm:p-10 dark:border-white/10 dark:bg-zinc-900/70 dark:shadow-[0_24px_90px_rgba(0,0,0,0.3)]">
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-neutral-500 dark:text-zinc-400">Registro</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-[-0.02em] text-neutral-950 dark:text-white">Crear tu cuenta en AVG Connects</h1>
        <p className="mt-3 text-neutral-600 dark:text-zinc-300">Guardá tus datos, seguí tus pedidos y disfrutá una experiencia más fluida desde el primer acceso.</p>
        <form onSubmit={handleSubmit} className="mt-8 grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-medium text-neutral-700">Nombre</label>
            <input className="premium-input" placeholder="Nombre" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-neutral-700">Apellido</label>
            <input className="premium-input" placeholder="Apellido" value={form.lastName} onChange={(event) => setForm({ ...form, lastName: event.target.value })} required />
          </div>
          <div className="md:col-span-2">
            <label className="mb-2 block text-sm font-medium text-neutral-700">Email</label>
            <input type="email" className="premium-input" placeholder="Email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} required />
          </div>
          <div className="md:col-span-2">
            <label className="mb-2 block text-sm font-medium text-neutral-700">Teléfono</label>
            <input className="premium-input" placeholder="Teléfono" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} />
          </div>
          <div className="md:col-span-2">
            <label className="mb-2 block text-sm font-medium text-neutral-700">Contraseña</label>
            <input type="password" className="premium-input" placeholder="Contraseña" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} required />
          </div>
          <div className="md:col-span-2">
            <label className="mb-2 block text-sm font-medium text-neutral-700">Confirmar contraseña</label>
            <input type="password" className="premium-input" placeholder="Confirmar contraseña" value={form.confirmPassword} onChange={(event) => setForm({ ...form, confirmPassword: event.target.value })} required />
          </div>
          <div className="md:col-span-2">
            <button type="submit" disabled={isSubmitting} className="w-full rounded-full bg-neutral-950 px-4 py-3 text-sm font-semibold text-white shadow-[0_16px_45px_rgba(0,0,0,0.16)] transition hover:-translate-y-0.5 hover:bg-neutral-800 active:scale-[0.98] disabled:opacity-60 dark:bg-white dark:text-neutral-950 dark:hover:bg-zinc-100">{isSubmitting ? "Creando cuenta..." : "Crear cuenta"}</button>
            {message ? <p className="mt-3 rounded-[1rem] border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm text-neutral-700">{message}</p> : null}
            <p className="mt-3 text-sm text-neutral-600">
              ¿Ya tenés cuenta? <Link href="/login" className="font-semibold text-neutral-950 dark:text-white">Iniciar sesión</Link>
            </p>
          </div>
        </form>
      </div>
    </main>
  );
}

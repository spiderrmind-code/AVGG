"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";

export default function AccountPage() {
  const { data: session, status } = useSession();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: "", phone: "", address: "", city: "", province: "", postalCode: "" });
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (status !== "authenticated") return;
    fetch("/api/account")
      .then((res) => res.json())
      .then((data) => {
        setProfile(data.user);
        setForm({
          name: data.user?.name ?? "",
          phone: data.user?.phone ?? "",
          address: data.user?.address ?? "",
          city: data.user?.city ?? "",
          province: data.user?.province ?? "",
          postalCode: data.user?.postalCode ?? "",
        });
      })
      .finally(() => setLoading(false));
  }, [status]);

  async function handleSave(event: React.FormEvent) {
    event.preventDefault();
    const response = await fetch("/api/account", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await response.json();
    setMessage(data.message ?? "Perfil actualizado");
  }

  if (status === "loading" || loading) return <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(255,47,146,0.14),_transparent_35%),linear-gradient(180deg,_#f7f3ea_0%,_#f1ece4_100%)] px-4 py-16 sm:px-6 lg:px-8 dark:bg-[radial-gradient(circle_at_top_left,_rgba(255,47,146,0.16),_transparent_30%),linear-gradient(180deg,_#07080d_0%,_#0d1018_100%)]"><div className="mx-auto max-w-5xl rounded-[2.2rem] border border-white/70 bg-white/80 p-8 shadow-[0_20px_80px_rgba(0,0,0,0.06)] backdrop-blur-xl dark:border-white/10 dark:bg-zinc-900/70">Cargando perfil...</div></main>;
  if (!session) return <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(255,47,146,0.14),_transparent_35%),linear-gradient(180deg,_#f7f3ea_0%,_#f1ece4_100%)] px-4 py-16 sm:px-6 lg:px-8 dark:bg-[radial-gradient(circle_at_top_left,_rgba(255,47,146,0.16),_transparent_30%),linear-gradient(180deg,_#07080d_0%,_#0d1018_100%)]"><div className="mx-auto max-w-5xl rounded-[2.2rem] border border-white/70 bg-white/80 p-8 shadow-[0_20px_80px_rgba(0,0,0,0.06)] backdrop-blur-xl dark:border-white/10 dark:bg-zinc-900/70">Debes iniciar sesión para ver tu cuenta.</div></main>;

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(255,47,146,0.12),_transparent_35%),linear-gradient(180deg,_#f7f2ea_0%,_#efe7dd_100%)] px-4 py-16 sm:px-6 lg:px-8 dark:bg-[radial-gradient(circle_at_top_left,_rgba(255,47,146,0.16),_transparent_30%),linear-gradient(180deg,_#07080d_0%,_#0d1018_100%)]">
      <div className="mx-auto max-w-5xl rounded-[2.2rem] border border-white/70 bg-white/80 p-8 shadow-[0_24px_90px_rgba(0,0,0,0.08)] backdrop-blur-xl sm:p-10 dark:border-white/10 dark:bg-zinc-900/70 dark:shadow-[0_24px_90px_rgba(0,0,0,0.3)]">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-neutral-500 dark:text-zinc-400">Mi cuenta</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-[-0.02em] text-neutral-950 dark:text-white">Hola, {profile?.name || session.user?.email}</h1>
            <p className="mt-2 text-neutral-600 dark:text-zinc-300">Gestioná tus datos, direcciones y pedidos desde un solo lugar.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/account/orders" className="rounded-full bg-neutral-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-neutral-800">Ver pedidos</Link>
            <Link href="/wishlist" className="rounded-full border border-black/10 bg-white/80 px-4 py-2 text-sm font-semibold text-neutral-900 transition hover:bg-white">Favoritos</Link>
          </div>
        </div>

        <div className="mt-8 grid gap-4 rounded-[1.6rem] border border-black/10 bg-white/70 p-4 md:grid-cols-3 dark:border-white/10 dark:bg-white/10">
          <div className="rounded-[1.2rem] border border-black/10 bg-white/80 p-4 dark:border-white/10 dark:bg-zinc-900/70">
            <p className="text-sm text-neutral-500 dark:text-zinc-400">Perfil</p>
            <p className="mt-2 font-semibold text-neutral-950 dark:text-white">{profile?.name || session.user?.email}</p>
          </div>
          <div className="rounded-[1.2rem] border border-black/10 bg-white/80 p-4 dark:border-white/10 dark:bg-zinc-900/70">
            <p className="text-sm text-neutral-500 dark:text-zinc-400">Estado</p>
            <p className="mt-2 font-semibold text-neutral-950 dark:text-white">Activo</p>
          </div>
          <div className="rounded-[1.2rem] border border-black/10 bg-white/80 p-4 dark:border-white/10 dark:bg-zinc-900/70">
            <p className="text-sm text-neutral-500 dark:text-zinc-400">Soporte</p>
            <p className="mt-2 font-semibold text-neutral-950 dark:text-white">Respuesta rápida</p>
          </div>
        </div>

        <form onSubmit={handleSave} className="mt-8 grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-medium text-neutral-700">Nombre</label>
            <input className="premium-input" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-neutral-700">Teléfono</label>
            <input className="premium-input" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} />
          </div>
          <div className="md:col-span-2">
            <label className="mb-2 block text-sm font-medium text-neutral-700">Dirección</label>
            <input className="premium-input" value={form.address} onChange={(event) => setForm({ ...form, address: event.target.value })} />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-neutral-700">Ciudad</label>
            <input className="premium-input" value={form.city} onChange={(event) => setForm({ ...form, city: event.target.value })} />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-neutral-700">Provincia</label>
            <input className="premium-input" value={form.province} onChange={(event) => setForm({ ...form, province: event.target.value })} />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-neutral-700">Código postal</label>
            <input className="premium-input" value={form.postalCode} onChange={(event) => setForm({ ...form, postalCode: event.target.value })} />
          </div>
          <div className="md:col-span-2">
            <button type="submit" className="rounded-full bg-neutral-950 px-5 py-3 text-sm font-semibold text-white shadow-[0_16px_45px_rgba(0,0,0,0.16)] transition hover:-translate-y-0.5 hover:bg-neutral-800 active:scale-[0.98]">Guardar cambios</button>
            {message ? <p className="mt-3 rounded-[1rem] border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm text-neutral-700 dark:border-white/10 dark:bg-white/10 dark:text-zinc-200">{message}</p> : null}
          </div>
        </form>
      </div>
    </main>
  );
}

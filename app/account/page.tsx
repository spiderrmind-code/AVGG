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

  if (status === "loading" || loading) return <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(0,0,0,0.03),_transparent_45%)] px-4 py-16 sm:px-6 lg:px-8"><div className="mx-auto max-w-5xl rounded-[2rem] border border-white/70 bg-white/80 p-8 shadow-[0_20px_80px_rgba(0,0,0,0.06)] backdrop-blur-xl">Cargando perfil...</div></main>;
  if (!session) return <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(0,0,0,0.03),_transparent_45%)] px-4 py-16 sm:px-6 lg:px-8"><div className="mx-auto max-w-5xl rounded-[2rem] border border-white/70 bg-white/80 p-8 shadow-[0_20px_80px_rgba(0,0,0,0.06)] backdrop-blur-xl">Debes iniciar sesión para ver tu cuenta.</div></main>;

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(0,0,0,0.03),_transparent_45%)] px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl rounded-[2rem] border border-white/70 bg-white/80 p-8 shadow-[0_24px_80px_rgba(0,0,0,0.08)] backdrop-blur-xl">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-neutral-500">Mi cuenta</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-[-0.02em] text-neutral-950">Hola, {profile?.name || session.user?.email}</h1>
            <p className="mt-2 text-neutral-600">Gestioná tus datos, direcciones y pedidos desde un solo lugar.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/account/orders" className="rounded-full bg-neutral-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-neutral-800">Ver pedidos</Link>
            <Link href="/wishlist" className="rounded-full border border-neutral-200 bg-white/80 px-4 py-2 text-sm font-semibold text-neutral-900 transition hover:bg-neutral-50">Favoritos</Link>
          </div>
        </div>

        <form onSubmit={handleSave} className="mt-8 grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-medium text-neutral-700">Nombre</label>
            <input className="w-full rounded-2xl border border-neutral-200 bg-white/80 px-3 py-3 text-sm outline-none transition focus:border-neutral-300 focus:ring-2 focus:ring-neutral-200" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-neutral-700">Teléfono</label>
            <input className="w-full rounded-2xl border border-neutral-200 bg-white/80 px-3 py-3 text-sm outline-none transition focus:border-neutral-300 focus:ring-2 focus:ring-neutral-200" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} />
          </div>
          <div className="md:col-span-2">
            <label className="mb-2 block text-sm font-medium text-neutral-700">Dirección</label>
            <input className="w-full rounded-2xl border border-neutral-200 bg-white/80 px-3 py-3 text-sm outline-none transition focus:border-neutral-300 focus:ring-2 focus:ring-neutral-200" value={form.address} onChange={(event) => setForm({ ...form, address: event.target.value })} />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-neutral-700">Ciudad</label>
            <input className="w-full rounded-2xl border border-neutral-200 bg-white/80 px-3 py-3 text-sm outline-none transition focus:border-neutral-300 focus:ring-2 focus:ring-neutral-200" value={form.city} onChange={(event) => setForm({ ...form, city: event.target.value })} />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-neutral-700">Provincia</label>
            <input className="w-full rounded-2xl border border-neutral-200 bg-white/80 px-3 py-3 text-sm outline-none transition focus:border-neutral-300 focus:ring-2 focus:ring-neutral-200" value={form.province} onChange={(event) => setForm({ ...form, province: event.target.value })} />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-neutral-700">Código postal</label>
            <input className="w-full rounded-2xl border border-neutral-200 bg-white/80 px-3 py-3 text-sm outline-none transition focus:border-neutral-300 focus:ring-2 focus:ring-neutral-200" value={form.postalCode} onChange={(event) => setForm({ ...form, postalCode: event.target.value })} />
          </div>
          <div className="md:col-span-2">
            <button type="submit" className="rounded-full bg-neutral-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-neutral-800">Guardar cambios</button>
            {message ? <p className="mt-3 text-sm text-neutral-600">{message}</p> : null}
          </div>
        </form>
      </div>
    </main>
  );
}

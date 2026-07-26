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

  if (status === "loading" || loading) return <main className="min-h-screen bg-neutral-50 px-4 py-16">Cargando perfil...</main>;
  if (!session) return <main className="min-h-screen bg-neutral-50 px-4 py-16">Debes iniciar sesión para ver tu cuenta.</main>;

  return (
    <main className="min-h-screen bg-neutral-50 px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl rounded-3xl border border-neutral-200 bg-white p-8 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-neutral-500">Mi cuenta</p>
            <h1 className="mt-2 text-3xl font-semibold">Hola, {profile?.name || session.user?.email}</h1>
            <p className="mt-2 text-neutral-600">Gestioná tus datos, direcciones y pedidos desde un solo lugar.</p>
          </div>
          <div className="flex gap-3">
            <Link href="/account/orders" className="rounded-xl bg-black px-4 py-2 text-sm font-semibold text-white">Ver pedidos</Link>
            <Link href="/wishlist" className="rounded-xl border border-neutral-300 px-4 py-2 text-sm font-semibold text-neutral-900">Favoritos</Link>
          </div>
        </div>

        <form onSubmit={handleSave} className="mt-8 grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-medium">Nombre</label>
            <input className="w-full rounded-xl border border-neutral-300 px-3 py-2" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium">Teléfono</label>
            <input className="w-full rounded-xl border border-neutral-300 px-3 py-2" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} />
          </div>
          <div className="md:col-span-2">
            <label className="mb-2 block text-sm font-medium">Dirección</label>
            <input className="w-full rounded-xl border border-neutral-300 px-3 py-2" value={form.address} onChange={(event) => setForm({ ...form, address: event.target.value })} />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium">Ciudad</label>
            <input className="w-full rounded-xl border border-neutral-300 px-3 py-2" value={form.city} onChange={(event) => setForm({ ...form, city: event.target.value })} />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium">Provincia</label>
            <input className="w-full rounded-xl border border-neutral-300 px-3 py-2" value={form.province} onChange={(event) => setForm({ ...form, province: event.target.value })} />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium">Código postal</label>
            <input className="w-full rounded-xl border border-neutral-300 px-3 py-2" value={form.postalCode} onChange={(event) => setForm({ ...form, postalCode: event.target.value })} />
          </div>
          <div className="md:col-span-2">
            <button type="submit" className="rounded-xl bg-black px-5 py-3 text-sm font-semibold text-white">Guardar cambios</button>
            {message ? <p className="mt-3 text-sm text-neutral-600">{message}</p> : null}
          </div>
        </form>
      </div>
    </main>
  );
}

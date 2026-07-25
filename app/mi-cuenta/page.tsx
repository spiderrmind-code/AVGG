"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

type Account = {
  id: string;
  name: string;
  email: string;
  image: string | null;
  role: string;
};

export default function MiCuentaPage() {
  const { status } = useSession();
  const router = useRouter();

  const [account, setAccount] = useState<Account | null>(null);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/");
      return;
    }

    if (status === "authenticated") {
      fetch("/api/account")
        .then((res) => res.json())
        .then((data) => {
          if (data.success) {
            setAccount(data.user);
            setName(data.user.name ?? "");
          }
        })
        .finally(() => setLoading(false));
    }
  }, [status, router]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    const res = await fetch("/api/account", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });

    const data = await res.json();
    setMessage(data.message);
    setSaving(false);
  }

  if (status === "loading" || loading) {
    return <div className="max-w-xl mx-auto mt-32 px-6">Cargando...</div>;
  }

  if (!account) {
    return (
      <div className="max-w-xl mx-auto mt-32 px-6">
        No se pudo cargar tu cuenta.
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto mt-32 px-6 pb-20">
      <h1 className="text-3xl font-bold mb-6">Mi cuenta</h1>

      <div className="flex items-center gap-4 mb-8">
        {account.image ? (
          <img
            src={account.image}
            alt={account.name}
            className="w-16 h-16 rounded-full object-cover"
          />
        ) : (
          <div className="w-16 h-16 rounded-full bg-neutral-200 flex items-center justify-center text-xl font-semibold">
            {account.email[0]?.toUpperCase()}
          </div>
        )}

        <div>
          <p className="font-semibold">{account.email}</p>
          <p className="text-sm text-neutral-500 capitalize">{account.role}</p>
        </div>
      </div>

      <form onSubmit={handleSave} className="flex flex-col gap-3">
        <label className="text-sm font-medium">Nombre</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="border rounded p-2"
          placeholder="Tu nombre"
        />

        <button
          type="submit"
          disabled={saving}
          className="bg-black text-white p-2 rounded disabled:opacity-50"
        >
          {saving ? "Guardando..." : "Guardar cambios"}
        </button>

        {message && <p className="text-sm text-green-600">{message}</p>}
      </form>
    </div>
  );
}
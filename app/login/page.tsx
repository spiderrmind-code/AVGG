"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setMessage("");
    if (!email.trim() || !password) {
      setMessage("Ingresá tu email y contraseña para continuar");
      return;
    }

    setIsSubmitting(true);
    const res = await signIn("credentials", {
      redirect: false,
      email,
      password,
    });
    if (res?.ok) {
      router.push("/admin/turnos");
    } else {
      setMessage("Usuario o contraseña incorrecta");
    }
    setIsSubmitting(false);
  };

  return (
    <main className="studio-admin-login min-h-screen px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-xl">
        <div className="studio-admin-login-panel">
          <p className="studio-kicker"><span /> 13 Studio Tattoo</p>
          <h1>Administración</h1>
          <p>Ingresá con una cuenta autorizada para gestionar turnos.</p>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium">Email</label>
              <input type="email" placeholder="tu@email.com" value={email} onChange={(event) => setEmail(event.target.value)} required className="premium-input mt-2 h-12" />
            </div>
            <div>
              <label className="text-sm font-medium">Contraseña</label>
              <input type="password" placeholder="Ingresá tu contraseña" value={password} onChange={(event) => setPassword(event.target.value)} required className="premium-input mt-2 h-12" />
            </div>
            <button type="submit" disabled={isSubmitting} className="studio-primary w-full">{isSubmitting ? "Ingresando..." : "Ingresar"}</button>
            {message ? <p className="rounded-[1rem] border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-600">{message}</p> : null}
          </form>
        </div>
      </div>
    </main>
  );
}

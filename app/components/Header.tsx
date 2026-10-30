"use client";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import { signOut, useSession } from "next-auth/react";
const links = [{ href: "/#estudio", label: "Estudio" }, { href: "/#galeria", label: "Galería" }, { href: "/#artistas", label: "Especialidades" }, { href: "/turnos", label: "Turnos" }];
export default function Header() {
	const [open, setOpen] = useState(false);
	const { data: session } = useSession();
	const accountHref = session?.user?.role === "admin" ? "/admin/turnos" : session ? "/mi-cuenta" : "/login";
	const accountLabel = session?.user?.role === "admin" ? "Administrar" : session ? "Mi cuenta" : "Ingresar";
	const handleSignOut = () => void signOut({ callbackUrl: "/login" });

	return <header className="studio-header">
		<div className="studio-header-inner">
			<Link href="/" className="studio-brand" aria-label="13 Studio Tattoo, inicio"><b>13</b><span>STUDIO<br />TATTOO</span></Link>
			<nav className="studio-nav" aria-label="Navegación principal">
				{links.map(link => <Link key={link.href} href={link.href}>{link.label}</Link>)}
				<Link href={accountHref}>{accountLabel}</Link>
				{session ? <button type="button" className="studio-text-link border-0 bg-transparent p-0" onClick={handleSignOut}>Cerrar sesión</button> : <Link href="/register">Crear cuenta</Link>}
			</nav>
			<Link href="/turnos" className="studio-book">Solicitar turno <i>↗</i></Link>
			<button type="button" onClick={() => setOpen(!open)} className="studio-menu" aria-label="Abrir menú">{open ? <X /> : <Menu />}</button>
		</div>
		{open ? <nav className="studio-mobile-nav" aria-label="Navegación móvil">
			{links.map(link => <Link key={link.href} href={link.href} onClick={() => setOpen(false)}>{link.label}</Link>)}
			<Link href={accountHref} onClick={() => setOpen(false)}>{accountLabel}</Link>
			{session ? <button type="button" className="block w-full py-[.65rem] text-left text-white" onClick={handleSignOut}>Cerrar sesión</button> : null}
		</nav> : null}
	</header>;
}

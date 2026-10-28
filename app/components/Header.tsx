"use client";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import { useSession } from "next-auth/react";
const links = [{ href: "/#estudio", label: "Estudio" }, { href: "/#galeria", label: "Galería" }, { href: "/#artistas", label: "Especialidades" }, { href: "/turnos", label: "Turnos" }];
export default function Header() { const [open, setOpen] = useState(false); const { data: session } = useSession(); return <header className="studio-header"><div className="studio-header-inner"><Link href="/" className="studio-brand" aria-label="13 Studio Tattoo, inicio"><b>13</b><span>STUDIO<br />TATTOO</span></Link><nav className="studio-nav" aria-label="Navegación principal">{links.map(link => <Link key={link.href} href={link.href}>{link.label}</Link>)}{session?.user?.role === "admin" ? <Link href="/admin/turnos">Administrar</Link> : null}</nav><Link href="/turnos" className="studio-book">Solicitar turno <i>↗</i></Link><button onClick={() => setOpen(!open)} className="studio-menu" aria-label="Abrir menú">{open ? <X /> : <Menu />}</button></div>{open ? <nav className="studio-mobile-nav" aria-label="Navegación móvil">{links.map(link => <Link key={link.href} href={link.href} onClick={() => setOpen(false)}>{link.label}</Link>)}</nav> : null}</header>; }

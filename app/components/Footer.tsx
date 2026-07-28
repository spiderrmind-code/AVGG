'use client';

import Link from 'next/link';
import { LogoSVG } from './Logo';

const footerLinks = [
  { href: '/nosotros', label: 'Nosotros' },
  { href: '/envios', label: 'Envíos' },
  { href: '/cambios', label: 'Cambios' },
  { href: '/contacto', label: 'Contacto' },
  { href: '/faq', label: 'FAQ' },
];

export default function Footer() {
  return (
    <footer className="mt-auto border-t" style={{ borderColor: "var(--color-border)", background: "var(--color-bg-strong)" }}>
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="ui-surface grid gap-8 p-8 lg:grid-cols-[1.1fr_0.7fr_0.7fr]">
          <div>
            <Link href="/" className="inline-flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-[1.15rem] border border-black/10 bg-white/90 shadow-[0_10px_30px_rgba(0,0,0,0.06)] dark:border-white/10 dark:bg-zinc-800/80">
                <LogoSVG />
              </div>
              <div>
                <p className="text-base font-semibold tracking-[-0.02em] text-neutral-950 dark:text-white">AVG CONNECTS</p>
                <p className="text-[11px] font-medium uppercase tracking-[0.24em] text-neutral-500 dark:text-zinc-400">Tecnología premium</p>
              </div>
            </Link>
            <p className="mt-5 max-w-sm text-sm leading-7 text-neutral-600 dark:text-zinc-300">
              Diseñamos una experiencia de compra elegante, confiable y pensada para personas que valoran tecnología, claridad y detalle.
            </p>
            <div className="mt-6 flex flex-wrap gap-2 text-sm text-neutral-600">
              <span className="rounded-full border border-black/10 bg-white/80 px-3 py-2 dark:border-white/10 dark:bg-white/10">Soporte real</span>
              <span className="rounded-full border border-black/10 bg-white/80 px-3 py-2 dark:border-white/10 dark:bg-white/10">Pago seguro</span>
              <span className="rounded-full border border-black/10 bg-white/80 px-3 py-2 dark:border-white/10 dark:bg-white/10">Envíos claros</span>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold uppercase tracking-[0.24em] text-neutral-500 dark:text-zinc-400">Explorar</h3>
            <ul className="mt-4 space-y-3 text-sm text-neutral-700 dark:text-zinc-300">
              {footerLinks.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className="transition hover:text-neutral-950 dark:hover:text-white">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold uppercase tracking-[0.24em] text-neutral-500 dark:text-zinc-400">Soporte</h3>
            <ul className="mt-4 space-y-3 text-sm text-neutral-700 dark:text-zinc-300">
              <li>Atención por email y WhatsApp</li>
              <li>Pagos seguros y seguimiento</li>
              <li>Garantía y devoluciones claras</li>
            </ul>
            <div className="mt-6 flex items-center gap-3 text-sm text-neutral-600 dark:text-zinc-300">
              <a href="https://www.instagram.com" target="_blank" rel="noreferrer" className="rounded-full border border-black/10 bg-white/80 px-3 py-2 transition hover:border-neutral-300 hover:text-neutral-950 dark:border-white/10 dark:bg-white/10 dark:hover:text-white">Instagram</a>
              <a href="https://www.linkedin.com" target="_blank" rel="noreferrer" className="rounded-full border border-black/10 bg-white/80 px-3 py-2 transition hover:border-neutral-300 hover:text-neutral-950 dark:border-white/10 dark:bg-white/10 dark:hover:text-white">LinkedIn</a>
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-3 border-t border-white/60 pt-6 text-sm text-neutral-500 dark:border-white/10 dark:text-zinc-400 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} AVG CONNECTS. Todos los derechos reservados.</p>
          <p className="text-neutral-600 dark:text-zinc-300">Diseñado para sentirse como una plataforma tecnológica sólida y premium.</p>
        </div>
      </div>
    </footer>
  );
}

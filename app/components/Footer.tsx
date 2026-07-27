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
    <footer className="border-t border-neutral-200 bg-[radial-gradient(circle_at_top_left,_rgba(0,0,0,0.03),_transparent_60%)]">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid gap-8 rounded-[2rem] border border-white/70 bg-white/70 p-8 shadow-[0_20px_80px_rgba(0,0,0,0.06)] backdrop-blur-2xl lg:grid-cols-[1.1fr_0.8fr_0.7fr]">
          <div>
            <Link href="/" className="inline-flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-neutral-200 bg-white/90 shadow-sm">
                <LogoSVG />
              </div>
              <div>
                <p className="text-base font-semibold tracking-[-0.02em] text-neutral-950">AVG CONNECTS</p>
                <p className="text-[11px] font-medium uppercase tracking-[0.24em] text-neutral-500">Tecnología premium</p>
              </div>
            </Link>
            <p className="mt-5 max-w-sm text-sm leading-7 text-neutral-600">
              Diseñamos una experiencia de compra elegante, confiable y pensada para personas que valoran tecnología, claridad y detalle.
            </p>
          </div>

          <div>
            <h3 className="text-sm font-semibold uppercase tracking-[0.24em] text-neutral-500">Explorar</h3>
            <ul className="mt-4 space-y-3 text-sm text-neutral-700">
              {footerLinks.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className="transition hover:text-neutral-950">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold uppercase tracking-[0.24em] text-neutral-500">Soporte</h3>
            <ul className="mt-4 space-y-3 text-sm text-neutral-700">
              <li>Atención por email y WhatsApp</li>
              <li>Pagos seguros y seguimiento</li>
              <li>Garantía y devoluciones claras</li>
            </ul>
            <div className="mt-6 flex items-center gap-3 text-sm text-neutral-600">
              <a href="https://www.instagram.com" target="_blank" rel="noreferrer" className="rounded-full border border-neutral-200 bg-white/80 px-3 py-2 transition hover:border-neutral-300 hover:text-neutral-950">Instagram</a>
              <a href="https://www.linkedin.com" target="_blank" rel="noreferrer" className="rounded-full border border-neutral-200 bg-white/80 px-3 py-2 transition hover:border-neutral-300 hover:text-neutral-950">LinkedIn</a>
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-3 border-t border-neutral-200 pt-6 text-sm text-neutral-500 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} AVG CONNECTS. Todos los derechos reservados.</p>
          <p className="text-neutral-600">Diseñado para sentirse como una plataforma tecnológica sólida y premium.</p>
        </div>
      </div>
    </footer>
  );
}

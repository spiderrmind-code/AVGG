'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="relative w-full bg-black/5 backdrop-blur-sm border-t border-[#ff007f]/10">
      <div className="max-w-[2400px] mx-auto px-6 lg:px-10 py-10 flex flex-col md:flex-row items-center justify-between gap-6">
        
        {/* Logo central/transparente */}
        <Link href="/" className="flex items-center gap-3 opacity-70 hover:opacity-100 transition">
          <div className="w-14 h-14 rounded-lg flex items-center justify-center bg-neutral-100/0 border border-[#ff007f]/10 shadow-sm">
            <Image src="/logo.png" alt="AVG CONNECTs" width={220} height={64} className="object-contain" />
          </div>
          <span className="font-extrabold text-neutral-900 text-base tracking-tight">AVG CONNECTS</span>
        </Link>

        {/* Mensaje de pertenencia */}
        <p className="text-sm text-neutral-600 text-center md:text-left max-w-xs">
          Gracias por ser parte de nuestra comunidad. Explora, aprende y conecta con lo mejor de la tecnología.
        </p>

        {/* Links pequeños, solo si se quiere */}
        <div className="flex gap-4 text-sm text-[#ff007f]/70 opacity-80 hover:opacity-100 transition">
          <Link href="/terminos" className="hover:underline">Términos</Link>
          <Link href="/privacidad" className="hover:underline">Privacidad</Link>
          <Link href="/soporte" className="hover:underline">Soporte</Link>
        </div>
      </div>

      <div className="w-full border-t border-[#ff007f]/10 mt-6 pt-4 text-center text-xs text-neutral-500">
        &copy; {new Date().getFullYear()} AVG CONNECTS. Todos los derechos reservados.
      </div>
    </footer>
  );
}

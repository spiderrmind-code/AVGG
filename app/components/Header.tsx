// components/Header.tsx
'use client';

import React, { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import MegaMenu from './MegaMenu';
import {
  Menu,
  X,
  Search as IconSearch,
  ShoppingCart,
  User,
  ChevronDown,
  Heart,
  Bell,
  Trash2,
  Sun,
  Moon,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { signIn, useSession, signOut } from 'next-auth/react';
import { useCart } from '@/context/CartContext';

const MotionDiv = motion.div as React.ComponentType<any>;
const MotionUL = motion.ul as React.ComponentType<any>;
const MotionAside = motion.aside as React.ComponentType<any>;

export type Product = { id: string; title: string; href: string; image: string; price?: string };
export type Category = { name: string; slug: string; children?: { name: string; slug: string }[] };

export default function Header() {
  const { data: session } = useSession();
  const { cart, removeFromCart } = useCart();

  const [megaOpen, setMegaOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [featured, setFeatured] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [search, setSearch] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [selectedSuggestion, setSelectedSuggestion] = useState<number | null>(null);
  const [scrolled, setScrolled] = useState(false);

  const cartCount = cart.reduce((total, item) => total + item.quantity, 0);

  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const searchRef = useRef<HTMLInputElement | null>(null);
  const suggestionRefs = useRef<Array<HTMLAnchorElement | null>>([]);
  const debounceRef = useRef<number | null>(null);
  const closeTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    async function loadFeatured() {
      try {
        const r = await fetch('/api/products');
        if (r.ok) {
          const j = await r.json();
          const arr = j.products ?? j.featured ?? j;
          if (Array.isArray(arr)) {
            const mapped: Product[] = arr.map((p: any) => ({
              id: p._id ?? p.id,
              title: p.title ?? p.name ?? '',
              href: p.slug ? `/producto/${p.slug}` : `/producto/${p._id ?? p.id}`,
              image: p.image ?? p.images?.[0] ?? '',
              price:
                typeof p.price === 'number'
                  ? new Intl.NumberFormat('es-US', { style: 'currency', currency: 'USD' }).format(p.price)
                  : p.price,
            }));
            setFeatured(mapped);
            return;
          }
        }
        setFeatured([]);
      } catch (e) {
        console.error('Error cargando productos destacados en Header:', e);
        setFeatured([]);
      }
    }

    async function loadCategories() {
      try {
        const r = await fetch('/api/categories');
        if (r.ok) {
          const j = await r.json();
          const cats = j.categories ?? j;
          if (Array.isArray(cats)) { setCategories(cats as Category[]); return; }
        }
        setCategories([]);
      } catch (e) {
        console.error('Error cargando categorías en Header:', e);
        setCategories([]);
      }
    }

    loadFeatured();
    loadCategories();
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 26);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    if (!search.trim()) { setSuggestions([]); setSelectedSuggestion(null); return; }
    debounceRef.current = window.setTimeout(async () => {
      const q = search.trim();
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
        if (res.ok) {
          const json = await res.json();
          const results = json.results ?? json;
          if (Array.isArray(results)) {
            setSuggestions(results.slice(0, 6).map((r: any) => (typeof r === 'string' ? r : (r.name ?? r.title ?? ''))));
            setSelectedSuggestion(0);
            return;
          }
        }
        setSuggestions([]);
        setSelectedSuggestion(null);
      } catch {
        setSuggestions([]);
        setSelectedSuggestion(null);
      }
    }, 160) as unknown as number;

    return () => { if (debounceRef.current) window.clearTimeout(debounceRef.current); };
  }, [search]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMegaOpen(false);
        setMobileOpen(false);
        setCartOpen(false);
        setSuggestions([]);
      }
      if ((e.key === 'ArrowDown' || e.key === 'ArrowUp') && suggestions.length > 0) {
        e.preventDefault();
        setSelectedSuggestion((prev) => {
          if (prev === null) return 0;
          if (e.key === 'ArrowDown') return Math.min(prev + 1, suggestions.length - 1);
          return Math.max(prev - 1, 0);
        });
      }
      if (e.key === 'Enter' && selectedSuggestion !== null && suggestions[selectedSuggestion]) {
        const q = suggestions[selectedSuggestion];
        window.location.href = `/search?q=${encodeURIComponent(q)}`;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [suggestions, selectedSuggestion]);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!menuRef.current || !triggerRef.current) return;
      const target = e.target as Node;
      if (menuRef.current.contains(target)) return;
      if (triggerRef.current.contains(target)) return;
      setMegaOpen(false);
    }
    if (megaOpen) document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [megaOpen]);

  useEffect(() => {
    if (selectedSuggestion !== null) {
      const el = suggestionRefs.current[selectedSuggestion];
      if (el) el.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedSuggestion]);

  useEffect(() => {
    return () => {
      if (closeTimeoutRef.current) {
        window.clearTimeout(closeTimeoutRef.current);
        closeTimeoutRef.current = null;
      }
      if (debounceRef.current) {
        window.clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }
    };
  }, []);

  function openMenuImmediate() {
    if (closeTimeoutRef.current) {
      window.clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
    setMegaOpen(true);
  }
  function scheduleClose(delay = 200) {
    if (closeTimeoutRef.current) window.clearTimeout(closeTimeoutRef.current);
    closeTimeoutRef.current = window.setTimeout(() => {
      setMegaOpen(false);
      closeTimeoutRef.current = null;
    }, delay) as unknown as number;
  }

  function handleCardMove(e: React.MouseEvent<HTMLDivElement>) {
    const el = e.currentTarget;
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = e.clientX - cx;
    const dy = e.clientY - cy;
    const rx = -(dy / (rect.height / 2)) * 6;
    const ry = (dx / (rect.width / 2)) * 6;
    (el.style as any).transform = `perspective(700px) rotateX(${rx}deg) rotateY(${ry}deg) scale(1.03)`;
    el.style.transition = 'transform 120ms ease-out';
  }
  function handleCardLeave(e: React.MouseEvent<HTMLDivElement>) {
    const el = e.currentTarget;
    (el.style as any).transform = 'none';
    el.style.transition = 'transform 220ms cubic-bezier(.2,.9,.2,1)';
  }

  const headerBg = scrolled ? 'bg-white/95' : 'bg-white/90';
  const headerText = 'text-neutral-900';
  const logoBoxSize = scrolled ? 'w-10 h-10' : 'w-14 h-14';
  const logoTextSize = scrolled ? 'text-sm' : 'text-base';

  function setSuggestionRef(index: number) {
    return (el: HTMLAnchorElement | null) => {
      suggestionRefs.current[index] = el;
    };
  }

  return (
    <>
      <header className={`fixed inset-x-0 top-0 z-50 transition-[background,padding,box-shadow] duration-300 ${headerBg} shadow-[0_6px_30px_rgba(0,0,0,0.06)] border-b border-[#ff007f]/10`} role="banner" aria-label="Header principal">
        <div className="max-w-[2400px] mx-auto px-6 lg:px-10 h-full">
          <div className="h-full flex items-center justify-between gap-4">
            {/* LEFT: logo + nav */}
            <div className="flex items-center gap-5">
              <Link href="/" className="flex items-center gap-3 group" aria-label="Ir al inicio">
                <div className={`${logoBoxSize} rounded-lg flex items-center justify-center shadow-md transition-all duration-300 bg-neutral-100 border border-[#ff007f]/10`}>
                  <Image src="/logo.png" alt="AVG CONNECTS" width={220} height={64} priority className="object-contain" />
                </div>
                <div className="hidden sm:flex flex-col !leading-none subpixel-antialiased translate-y-[0.1px]">
                  <span className={`font-extrabold tracking-tight ${logoTextSize} ${headerText} antialiased`}>AVG CONNECTS</span>
                  <small className={`text-[#ff007f] text-xs -mt-0.5 antialiased`}>Tech & más</small>
                </div>
              </Link>

              <nav className="hidden lg:flex items-center gap-6" aria-label="Navegación principal">
                <Link href="/" className={`text-sm text-neutral-800 hover:text-neutral-900 transition`}>Inicio</Link>

                <div className="relative">
                  <button
                    ref={triggerRef}
                    onMouseEnter={openMenuImmediate}
                    onMouseLeave={() => scheduleClose(180)}
                    onFocus={openMenuImmediate}
                    onBlur={() => scheduleClose(180)}
                    aria-expanded={megaOpen}
                    aria-controls="mega-menu"
                    className={`flex items-center gap-1 text-sm text-neutral-800 hover:text-neutral-900 transition`}
                  >
                    Colecciones <ChevronDown className={`w-4 h-4 text-[#ff007f] ${megaOpen ? 'rotate-180' : ''}`} />
                  </button>

                  <MegaMenu
                    ref={menuRef as any}
                    open={megaOpen}
                    categories={categories}
                    onMouseEnter={openMenuImmediate}
                    onMouseLeave={() => scheduleClose(180)}
                    onClose={() => setMegaOpen(false)}
                  />
                </div>
              </nav>
            </div>

            {/* CENTER: search */}
            <div className="flex-1 hidden md:flex justify-center px-4">
              <div className="w-full max-w-3xl relative">
                <div className="relative">
                  <input
                    ref={searchRef}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Buscar celulares, accesorios, marcas..."
                    className={`w-full rounded-full border border-[#ff007f]/12 bg-white text-neutral-900 py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#ff007f]/40 transition`}
                    aria-autocomplete="list"
                    aria-controls="search-suggestions"
                    aria-label="Buscar productos"
                  />
                  <IconSearch className={`absolute left-3 top-1/2 -translate-y-1/2 text-[#ff007f] w-4 h-4`} />
                </div>

                <AnimatePresence>
                  {suggestions.length > 0 && (
                    <MotionUL
                      id="search-suggestions"
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      className={`absolute mt-2 w-full bg-white text-neutral-900 border-[#ff007f]/12 rounded-xl shadow-lg overflow-hidden z-50 border`}
                      role="listbox"
                    >
                      {suggestions.map((s, i) => {
                        const isActive = selectedSuggestion === i;
                        const itemClass = `block px-4 py-2 text-sm ${isActive ? 'bg-[#ff007f]/10 text-[#ff007f]' : 'text-neutral-800 hover:bg-[#ff007f]/10'}`;
                        return (
                          <li key={s}>
                            <Link
                              href={`/search?q=${encodeURIComponent(s)}`}
                              ref={setSuggestionRef(i)}
                              className={itemClass}
                            >
                              {s}
                            </Link>
                          </li>
                        );
                      })}
                    </MotionUL>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* RIGHT: actions */}
            <div className="flex items-center gap-3">
              <button aria-label="Favoritos" className={`hidden md:inline-flex p-2 rounded-md hover:bg-[#ff007f]/8 transition`}>
                <Heart className={`w-5 h-5 text-[#ff007f]`} />
              </button>

              <button aria-label="Notificaciones" className={`hidden md:inline-flex p-2 rounded-md hover:bg-[#ff007f]/8 transition`}>
                <Bell className={`w-5 h-5 text-[#ff007f]`} />
              </button>

              <div className="relative">
                <button
                  onMouseEnter={() => setCartOpen(true)}
                  onMouseLeave={() => setCartOpen(false)}
                  onFocus={() => setCartOpen(true)}
                  onBlur={() => setCartOpen(false)}
                  aria-haspopup="dialog"
                  aria-expanded={cartOpen}
                  className={`p-2 rounded-md hover:bg-[#ff007f]/8 transition relative`}
                >
                  <ShoppingCart className={`w-5 h-5 text-neutral-800`} />
                  {cartCount > 0 && <span className="absolute -top-1 -right-1 bg-[#ff007f] text-white text-xs rounded-full px-1.5">{cartCount}</span>}
                </button>

                <AnimatePresence>
                  {cartOpen && (
                    <MotionDiv initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} className={`absolute right-0 mt-2 w-80 bg-white text-neutral-900 border-[#ff007f]/12 rounded-xl shadow-xl border z-50`}>
                      <div className="p-4">
                        <h4 className="font-semibold text-sm">Carrito ({cartCount})</h4>
                        <div className="mt-3 space-y-3">
                          {cart.length === 0 ? (
                            <p className="text-sm text-neutral-500">Tu carrito está vacío.</p>
                          ) : (
                            cart.map((it) => (
                              <div key={it._id} className="flex items-center gap-3">
                                <div className="w-12 h-12 relative rounded overflow-hidden">
                                  <Image src={it.image} alt={it.name} fill sizes="48px" className="object-cover" />
                                </div>
                                <div className="flex-1">
                                  <div className={`text-sm font-medium text-neutral-900`}>{it.name}</div>
                                  <div className={`text-sm text-neutral-600`}>
                                    {new Intl.NumberFormat('es-US', { style: 'currency', currency: 'USD' }).format(it.price)}
                                    {it.quantity > 1 && ` × ${it.quantity}`}
                                  </div>
                                </div>
                                <button onClick={() => removeFromCart(it._id)} className="p-1 rounded hover:bg-[#ff007f]/10">
                                  <Trash2 className="w-4 h-4 text-[#ff007f]" />
                                </button>
                              </div>
                            ))
                          )}
                        </div>
                        <div className="mt-4 flex items-center justify-between">
                          <Link href="/carrito" className={`w-1/2 text-center px-3 py-2 border rounded-md text-sm text-neutral-800 border-[#ff007f]/12 hover:bg-[#ff007f]/10`}>Ver carrito</Link>
                          <Link href="/checkout" className={`w-1/2 ml-3 text-center px-3 py-2 rounded-md text-sm bg-[#ff007f] text-black hover:bg-[#ff007f]/90`}>Checkout</Link>
                        </div>
                      </div>
                    </MotionDiv>
                  )}
                </AnimatePresence>
              </div>

              <Link href="/mi-cuenta" className={`hidden md:inline-flex items-center gap-2 px-3 py-2 rounded-md transition hover:bg-[#ff007f]/8`}>
                <User className={`w-5 h-5 text-neutral-800`} />
                <span className={`text-sm text-neutral-800`}>Mi cuenta</span>
              </Link>

              <div>
                {!session ? (
                  <button
                    onClick={() => signIn('google')}
                    className={`hidden lg:inline-flex px-4 py-2 rounded-full font-semibold bg-[#ff007f] hover:bg-[#ff007f]/90 text-black`}
                    aria-label="Iniciar sesión con Google"
                  >
                    Iniciar con Google
                  </button>
                ) : (
                  <div className="hidden lg:inline-flex items-center gap-2 px-3 py-1 rounded-md border border-[#ff007f]/20">
                    {session.user?.image ? (
                      <img src={session.user.image as string} alt={session.user?.name ?? 'Usuario'} className="w-7 h-7 rounded-full object-cover" />
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-neutral-200 flex items-center justify-center text-sm text-neutral-600">U</div>
                    )}
                    <span className="text-sm text-neutral-800">{session.user?.name ?? session.user?.email}</span>
                    <button
                      onClick={() => signOut()}
                      className="ml-2 px-2 py-1 bg-[#ff007f] text-black rounded hover:bg-[#ff007f]/90"
                    >
                      Cerrar
                    </button>
                  </div>
                )}
              </div>

              <button onClick={() => setMobileOpen(true)} className={`md:hidden p-2 rounded-md hover:bg-[#ff007f]/8 transition`} aria-label="Abrir menú">
                <Menu className={`w-6 h-6 text-neutral-800`} />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* MOBILE DRAWER */}
      <AnimatePresence>
        {mobileOpen && (
          <MotionAside initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} className="fixed inset-0 z-50">
            <div className="absolute inset-0 bg-black/60" onClick={() => setMobileOpen(false)} />
            <div className={`absolute right-0 top-0 bottom-0 w-4/5 max-w-sm p-6 overflow-auto bg-white text-neutral-900 border-l border-[#ff007f]/8`}>
              <div className="flex items-center justify-between mb-6">
                <Link href="/" className={`font-bold text-lg text-neutral-900`}>AVG CONNECTS</Link>
                <button onClick={() => setMobileOpen(false)} className="p-2"><X className={`w-6 h-6 text-neutral-900`} /></button>
              </div>

              <div className="mb-4">
                <input placeholder="Buscar..." value={search} onChange={(e) => setSearch(e.target.value)} className={`w-full rounded-full py-2 pl-4 pr-3 bg-neutral-100 text-neutral-900`} />
              </div>

              <nav className="flex flex-col gap-3">
                <details open className={`border-b border-[#ff007f]/12 pb-2`}>
                  <summary className={`flex justify-between items-center cursor-pointer text-neutral-900`}>Colecciones <ChevronDown className={`w-4 h-4 text-neutral-900`} /></summary>
                  <div className="mt-3 flex flex-col gap-2">
                    {categories.length === 0 ? (
                      <span className="text-sm text-neutral-400 py-2">Sin categorías disponibles.</span>
                    ) : (
                      categories.map(cat => <Link key={cat.slug} href={`/categoria/${cat.slug}`} className={`py-2 text-neutral-900`}>{cat.name}</Link>)
                    )}
                  </div>
                </details>

                <Link href="/mi-cuenta" className={`py-3 text-neutral-900`}>Mi cuenta</Link>
                <Link href="/carrito" className={`py-3 text-neutral-900`}>Carrito ({cartCount})</Link>
              </nav>

              <div className={`pt-6 mt-6 border-t border-[#ff007f]/12`}>
                <button
                  onClick={() => signIn('google')}
                  className={`w-full text-center py-2 rounded-full font-semibold bg-[#ff007f] text-black`}
                  aria-label="Iniciar sesión con Google"
                >
                  Alístate ✨
                </button>
                <div className="mt-4 text-xs text-neutral-400">Soporte · Términos · Política de privacidad</div>
              </div>
            </div>
          </MotionAside>
        )}
      </AnimatePresence>
    </>
  );
}
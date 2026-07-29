// components/Header.tsx
'use client';

import React, { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import MegaMenu from './MegaMenu';
import { LogoSVG } from './Logo';
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
import { useCart } from '@/app/context/CartContext';
import ThemeToggle from './ThemeToggle';
import { catalogCategories } from '@/data/catalog-categories';

const MotionDiv = motion.div as React.ComponentType<any>;
const MotionUL = motion.ul as React.ComponentType<any>;
const MotionAside = motion.aside as React.ComponentType<any>;

export type Product = { id: string; title: string; href: string; image: string; price?: string };
export type Category = {
  _id?: string;
  name: string;
  slug: string;
  image?: string;
  children?: { name: string; slug: string }[];
};

export default function Header() {
  const { data: session, status } = useSession();
  const router = useRouter();
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
  const fallbackCategories: Category[] = catalogCategories.map((cat) => ({
    name: cat.name,
    slug: cat.slug,
    image: cat.image,
    children: (cat.children ?? []).map((child) => ({ name: child.name, slug: child.slug })),
  }));

  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const cartTriggerRef = useRef<HTMLButtonElement | null>(null);
  const cartMenuRef = useRef<HTMLDivElement | null>(null);
  const searchRef = useRef<HTMLInputElement | null>(null);
  const suggestionRefs = useRef<Array<HTMLAnchorElement | null>>([]);
  const debounceRef = useRef<number | null>(null);
  const closeTimeoutRef = useRef<number | null>(null);
  const previousSessionStatus = useRef(status);

  useEffect(() => {
    const previousStatus = previousSessionStatus.current;
    previousSessionStatus.current = status;
    if (previousStatus !== status && (status === "authenticated" || status === "unauthenticated")) {
      router.refresh();
    }
  }, [router, status]);

  async function handleSignOut() {
    await signOut({ redirect: false });
    router.refresh();
  }

 useEffect(() => {
  async function loadFeatured() {
    try {
      const apiUrl = "/api/products";

      const r = await fetch(apiUrl);

      if (!r.ok) {
        throw new Error("Error loading products");
      }

      const j = await r.json();
      const arr = j.products ?? j.featured ?? j;

      if (Array.isArray(arr)) {
        const mapped: Product[] = arr.map((p: any) => ({
          id: p._id ?? p.id,
          title: p.title ?? p.name ?? "",
          href: p.slug
            ? `/product/${p._id ?? p.id}`
            : `/product/${p._id ?? p.id}`,
          image: p.image ?? p.images?.[0] ?? "",
          price:
            typeof p.price === "number"
              ? new Intl.NumberFormat("es-US", {
                  style: "currency",
                  currency: "USD",
                }).format(p.price)
              : p.price,
        }));

        setFeatured(mapped);
      }
    } catch (error) {
      console.error("Error loading featured products:", error);
    }
  }

  loadFeatured();
  
  // load categories from API
  async function loadCategories() {
    try {
      const res = await fetch('/api/categories');
      if (!res.ok) throw new Error('Failed to load categories');
      const json = await res.json();
      const cats = json.categories ?? json;
      const normalized = Array.isArray(cats)
        ? cats
            .filter((c: any) => c?.name && c?.slug)
            .map((c: any) => ({
              _id: c._id ?? c.id ?? undefined,
              name: c.name,
              slug: c.slug,
              image: c.image,
              children: Array.isArray(c.children)
                ? c.children.map((ch: any) => ({ name: ch.name, slug: ch.slug }))
                : [],
            }))
        : [];

      setCategories(normalized);
    } catch (err) {
      console.error('Error loading categories:', err);
      setCategories(fallbackCategories);
    }
  }

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
    function onDoc(e: MouseEvent) {
      if (!cartMenuRef.current || !cartTriggerRef.current) return;
      const target = e.target as Node;
      if (cartMenuRef.current.contains(target)) return;
      if (cartTriggerRef.current.contains(target)) return;
      setCartOpen(false);
    }
    if (cartOpen) document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [cartOpen]);

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

  const headerBg = scrolled
    ? 'border-[color:var(--color-border)] bg-[color:var(--color-surface)] shadow-[0_10px_30px_rgba(17,17,17,0.08)] backdrop-blur-2xl'
    : 'border-[color:var(--color-border)] bg-[color:var(--color-surface)] shadow-[0_2px_14px_rgba(17,17,17,0.04)] backdrop-blur-xl';
  const headerText = 'text-neutral-900 dark:text-zinc-100';
  const logoBoxSize = scrolled ? 'w-10 h-10' : 'w-12 h-12';
  const logoTextSize = scrolled ? 'text-sm' : 'text-base';
  const navLinkClass = 'relative text-sm font-medium text-neutral-700 transition hover:text-neutral-950 dark:text-zinc-300 dark:hover:text-white after:absolute after:-bottom-1 after:left-0 after:h-px after:w-full after:origin-left after:scale-x-0 after:bg-neutral-950 after:transition-transform after:duration-200 hover:after:scale-x-100 dark:after:bg-white';
  const isSessionLoading = status === "loading";
  const isAuthenticated = status === "authenticated";

  function setSuggestionRef(index: number) {
    return (el: HTMLAnchorElement | null) => {
      suggestionRefs.current[index] = el;
    };
  }

  return (
    <>
      <header className={`fixed inset-x-0 top-0 z-50 border-b transition-[background,box-shadow,transform] duration-300 ${headerBg}`} role="banner" aria-label="Header principal">
        <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3 sm:gap-5">
            {/* LEFT: logo + nav */}
            <div className="flex items-center gap-5">
              <Link href="/" className="flex items-center gap-3" aria-label="Ir al inicio">
                <div className={`${logoBoxSize} flex items-center justify-center rounded-[1.15rem] border border-black/10 bg-white/90 shadow-[0_4px_16px_rgba(0,0,0,0.05)] transition-all duration-300 dark:border-white/10 dark:bg-zinc-900/80`}>
                  <LogoSVG />
                </div>
                <div className="hidden flex-col leading-none sm:flex">
                  <span className={`font-semibold tracking-[-0.02em] ${logoTextSize} ${headerText}`}>AVG CONNECTS</span>
                  <small className="mt-0.5 text-[11px] font-medium uppercase tracking-[0.24em] text-neutral-500">Tech & more</small>
                </div>
              </Link>

              <nav className="hidden items-center gap-6 md:flex lg:flex" aria-label="Navegación principal">
                <Link href="/" className={navLinkClass}>Inicio</Link>
                <Link href="/search?q=tecnologia" className={navLinkClass}>Ofertas</Link>
                <Link href="/search?q=novedades" className={navLinkClass}>Novedades</Link>

                <div className="relative">
                  <button
                    ref={triggerRef}
                    onMouseEnter={openMenuImmediate}
                    onMouseLeave={() => scheduleClose(180)}
                    onFocus={openMenuImmediate}
                    onBlur={() => scheduleClose(180)}
                    aria-expanded={megaOpen}
                    aria-controls="mega-menu"
                    className="flex items-center gap-1 rounded-full px-3 py-2 text-sm font-medium text-neutral-700 transition hover:bg-neutral-100 hover:text-neutral-950 dark:text-zinc-300 dark:hover:bg-white/10 dark:hover:text-white"
                  >
                    Colecciones <ChevronDown className={`h-4 w-4 text-neutral-500 transition ${megaOpen ? 'rotate-180' : ''}`} />
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

            <div className="hidden flex-1 justify-center px-2 md:flex">
              <div className="relative w-full max-w-xl">
                <div className="relative">
                  <input
                    ref={searchRef}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Buscar productos"
                    className="ui-input w-full rounded-full py-2.5 pl-10 pr-12"
                    aria-autocomplete="list"
                    aria-controls="search-suggestions"
                    aria-label="Buscar productos"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        const q = search.trim();
                        if (!q) return;
                        window.location.href = `/search?q=${encodeURIComponent(q)}`;
                      }
                    }}
                  />
                    <IconSearch className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500" />
                    <button aria-label="Buscar" onClick={() => {
                      const q = search.trim();
                      if (!q) return;
                      window.location.href = `/search?q=${encodeURIComponent(q)}`;
                    }} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-2 transition hover:bg-neutral-100">
                      <IconSearch className="h-4 w-4 text-neutral-600" />
                    </button>
                </div>

                <AnimatePresence>
                  {suggestions.length > 0 && (
                    <MotionUL
                      id="search-suggestions"
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      className="ui-popover absolute z-50 mt-2 w-full overflow-hidden backdrop-blur-xl"
                      role="listbox"
                    >
                      {suggestions.map((s, i) => {
                        const isActive = selectedSuggestion === i;
                        const itemClass = `block px-4 py-2.5 text-sm ${isActive ? 'bg-neutral-100 text-neutral-950' : 'text-neutral-700 hover:bg-neutral-50'}`;
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

            <div className="flex items-center gap-2 sm:gap-3">
              <button aria-label="Favoritos" className="ui-icon-button hidden md:inline-flex">
                <Heart className="h-4 w-4" />
              </button>

              <button aria-label="Notificaciones" className="ui-icon-button hidden md:inline-flex">
                <Bell className="h-4 w-4" />
              </button>

              <div className="relative" onMouseLeave={() => setCartOpen(false)}>
                <button
                  ref={cartTriggerRef}
                  onMouseEnter={() => setCartOpen(true)}
                  onFocus={() => setCartOpen(true)}
                  onClick={() => setCartOpen((prev) => !prev)}
                  aria-haspopup="dialog"
                  aria-expanded={cartOpen}
                  className="ui-icon-button relative"
                >
                  <ShoppingCart className="h-4 w-4" />
                  {cartCount > 0 && <span className="absolute -right-1 -top-1 rounded-full bg-neutral-950 px-1.5 py-0.5 text-[10px] font-semibold text-white">{cartCount}</span>}
                </button>

                <AnimatePresence>
                  {cartOpen && (
                    <MotionDiv
                      ref={cartMenuRef as any}
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      onMouseEnter={() => setCartOpen(true)}
                      className="absolute right-0 z-50 mt-2 w-[min(88vw,320px)] rounded-2xl border border-neutral-200 bg-white/95 p-4 shadow-[0_24px_70px_rgba(0,0,0,0.12)] backdrop-blur-xl"
                    >
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
                                <button onClick={() => removeFromCart(it._id)} className="rounded-full p-1.5 text-neutral-500 transition hover:bg-neutral-100 hover:text-neutral-900">
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            ))
                          )}
                        </div>
                        <div className="mt-4 flex items-center justify-between">
                          <Link href="/cart" className="w-1/2 rounded-full border border-neutral-200 px-3 py-2 text-center text-sm font-medium text-neutral-700 transition hover:bg-neutral-50">Ver carrito</Link>
                          <Link href="/checkout" className="ml-2 w-1/2 rounded-full bg-neutral-950 px-3 py-2 text-center text-sm font-semibold text-white transition hover:bg-neutral-800">Checkout</Link>
                        </div>
                      </div>
                    </MotionDiv>
                  )}
                </AnimatePresence>
              </div>

              <Link href={isAuthenticated ? "/account" : "/login"} className="hidden items-center gap-2 rounded-full border border-black/10 bg-white/80 px-3 py-2 text-sm font-medium text-neutral-700 shadow-[0_10px_25px_rgba(0,0,0,0.04)] transition hover:bg-white md:inline-flex dark:border-white/10 dark:bg-zinc-900/80 dark:text-zinc-200 dark:hover:bg-zinc-800">
                <User className="h-4 w-4" />
                <span>Mi cuenta</span>
              </Link>

              {isAuthenticated && (session as any)?.user?.role === "admin" ? (
                <Link href="/admin" className="hidden rounded-full border border-neutral-200 bg-neutral-950 px-3 py-2 text-sm font-semibold text-white md:inline-flex">
                  Admin
                </Link>
              ) : null}

              <div className="hidden lg:block">
                {isSessionLoading ? (
                  <span className="text-sm text-neutral-500" aria-live="polite">Verificando sesión…</span>
                ) : !isAuthenticated ? (
                  <button
                    onClick={() => signIn('google')}
                    className="hidden rounded-full bg-neutral-950 px-4 py-2 text-sm font-semibold text-white shadow-[0_12px_30px_rgba(0,0,0,0.18)] transition hover:bg-neutral-800 lg:inline-flex"
                    aria-label="Iniciar sesión con Google"
                  >
                    Continuar con Google
                  </button>
                ) : (
                  <div className="ui-card hidden items-center gap-2 rounded-md px-3 py-1 lg:inline-flex">
                    {session.user?.image ? (
                      <img src={session.user.image as string} alt={session.user?.name ?? 'Usuario'} className="w-7 h-7 rounded-full object-cover" />
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-neutral-200 flex items-center justify-center text-sm text-neutral-600">U</div>
                    )}
                    <span className="text-sm text-neutral-800">{session.user?.name ?? session.user?.email}</span>
                    <button
                      onClick={handleSignOut}
                      className="ml-1 rounded-full bg-neutral-950 px-2 py-1 text-xs font-semibold text-white"
                    >
                      Cerrar
                    </button>
                  </div>
                )}
              </div>

              <div className="hidden md:block">
                <ThemeToggle />
              </div>

              <button onClick={() => setMobileOpen(true)} className="ui-icon-button md:hidden" aria-label="Abrir menú">
                <Menu className="h-5 w-5" />
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
            <div className="absolute right-0 top-0 bottom-0 w-4/5 max-w-sm overflow-auto border-l border-black/10 bg-white/95 p-6 backdrop-blur-2xl dark:border-white/10 dark:bg-zinc-950/95">
              <div className="mb-6 flex items-center justify-between">
                <Link href="/" className="text-lg font-semibold text-neutral-950 dark:text-white">AVG CONNECTS</Link>
                <button onClick={() => setMobileOpen(false)} className="rounded-full p-2 text-neutral-700 transition hover:bg-neutral-100 dark:text-zinc-200 dark:hover:bg-zinc-800">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="mb-4 flex items-center justify-between gap-3">
                <input placeholder="Buscar..." value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const q = search.trim();
                    if (!q) return;
                    window.location.href = `/search?q=${encodeURIComponent(q)}`;
                  }
                }} className="w-full rounded-full border border-neutral-200 bg-neutral-50 py-2.5 pl-4 pr-3 text-sm text-neutral-900 outline-none dark:border-white/10 dark:bg-zinc-900/80 dark:text-zinc-100" />
              </div>

              <div className="mb-4">
                <ThemeToggle />
              </div>

              <nav className="flex flex-col gap-3">
                <details open className="rounded-[1.2rem] border border-black/10 bg-white/70 p-3 dark:border-white/10 dark:bg-white/10">
                  <summary className="flex cursor-pointer items-center justify-between text-sm font-semibold text-neutral-900 dark:text-white">Colecciones <ChevronDown className="h-4 w-4 text-neutral-500" /></summary>
                  <div className="mt-3 flex flex-col gap-2">
                    {categories.length === 0 ? (
                      <span className="py-2 text-sm text-neutral-400">Sin categorías disponibles.</span>
                    ) : (
                      categories.map(cat => <Link key={cat.slug} href={`/category/${cat.slug}`} className="rounded-xl px-2 py-2 text-sm text-neutral-700 transition hover:bg-neutral-100 hover:text-neutral-950 dark:text-zinc-300 dark:hover:bg-white/10">{cat.name}</Link>)
                    )}
                  </div>
                </details>

                <Link href={isAuthenticated ? "/account" : "/login"} className="rounded-[1rem] border border-black/10 bg-white/70 px-3 py-3 text-sm font-medium text-neutral-800 transition hover:bg-white dark:border-white/10 dark:bg-white/10 dark:text-zinc-200">Mi cuenta</Link>
                {isAuthenticated && (session as any)?.user?.role === "admin" ? (
                  <Link href="/admin" className="rounded-[1rem] border border-black/10 bg-neutral-950 px-3 py-3 text-sm font-semibold text-white">Panel admin</Link>
                ) : null}
                <Link href="/cart" className="rounded-[1rem] border border-black/10 bg-white/70 px-3 py-3 text-sm font-medium text-neutral-800 transition hover:bg-white dark:border-white/10 dark:bg-white/10 dark:text-zinc-200">Carrito ({cartCount})</Link>
              </nav>

              <div className="mt-6 border-t border-neutral-200 pt-6">
                {!isSessionLoading && !isAuthenticated ? (
                  <button
                    onClick={() => signIn('google')}
                    className="w-full rounded-full bg-neutral-950 py-2.5 text-center text-sm font-semibold text-white shadow-[0_12px_30px_rgba(0,0,0,0.16)] dark:bg-white dark:text-neutral-950"
                    aria-label="Iniciar sesión con Google"
                  >
                    Continuar con Google
                  </button>
                ) : null}
                <div className="mt-4 text-xs text-neutral-500">Soporte · Términos · Privacidad</div>
              </div>
            </div>
          </MotionAside>
        )}
      </AnimatePresence>
    </>
  );
}

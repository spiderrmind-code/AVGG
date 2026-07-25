import { useState, useEffect, useRef } from 'react';

export type Product = { id: string; title: string; href: string; image: string; price?: string };
export type Category = { name: string; slug: string; children?: { name: string; slug: string }[] };

export function useHeaderData() {
  const [megaOpen, setMegaOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(true);
  const [categories, setCategories] = useState<Category[]>([]);
  const [featured, setFeatured] = useState<Product[]>([]);

  // refs para mega menu
  const megaRef = useRef<HTMLDivElement | null>(null);

  // cargar datos reales
  useEffect(() => {
    async function loadCategories() {
      try {
        const res = await fetch('/api/categories');
        const data = await res.json();
        setCategories(data.categories ?? data);
      } catch {
        // fallback si API falla
        setCategories([
          { name: 'iPhone', slug: 'iphone', children: [{ name: 'iPhone 15', slug: 'iphone-15' }] },
          { name: 'Samsung', slug: 'samsung', children: [{ name: 'Galaxy S', slug: 'galaxy-s' }] },
        ]);
      }
    }

    async function loadFeatured() {
      try {
        const res = await fetch('/api/products/featured');
        const data = await res.json();
        setFeatured(data.featured ?? data.products ?? data);
      } catch {
        setFeatured([
          { id: '1', title: 'iPhone 15 Pro', href: '/p/iphone-15-pro', image: '/products/iphone-15.jpg', price: '$1199' },
        ]);
      }
    }

    loadCategories();
    loadFeatured();
  }, []);

  return {
    megaOpen, setMegaOpen,
    mobileOpen, setMobileOpen,
    darkMode, setDarkMode,
    categories,
    featured,
    megaRef,
  };
}

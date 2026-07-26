import { useState, useEffect, useRef } from 'react';

export type Product = {
  id: string;
  title: string;
  href: string;
  image: string;
  price?: string;
};

export type Category = {
  name: string;
  slug: string;
  children?: { name: string; slug: string }[];
};

export function useHeaderData() {
  const [megaOpen, setMegaOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(true);
  const [categories, setCategories] = useState<Category[]>([]);
  const [featured, setFeatured] = useState<Product[]>([]);

  const megaRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    async function loadCategories() {
      try {
        const res = await fetch('/api/categories');

        if (!res.ok) {
          throw new Error("Error loading categories");
        }

        const data = await res.json();

        setCategories(data.categories ?? data);

      } catch (error) {
        console.error("ERROR CATEGORIES:", error);

        setCategories([
          {
            name: "iPhone",
            slug: "iphone",
            children: [
              {
                name: "iPhone 15",
                slug: "iphone-15",
              },
            ],
          },
          {
            name: "Samsung",
            slug: "samsung",
            children: [
              {
                name: "Galaxy S",
                slug: "galaxy-s",
              },
            ],
          },
        ]);
      }
    }


    async function loadFeatured() {
      try {
        const res = await fetch('/api/products/featured');

        if (!res.ok) {
          throw new Error("Error loading featured products");
        }

        const data = await res.json();

        setFeatured(
          data.featured ??
          data.products ??
          data
        );

      } catch (error) {
        console.error("ERROR FEATURED:", error);

        setFeatured([
          {
            id: "1",
            title: "iPhone 15 Pro",
            href: "/p/iphone-15-pro",
            image: "/products/iphone-15.jpg",
            price: "$1199",
          },
        ]);
      }
    }


    loadCategories();
    loadFeatured();

  }, []);


  return {
    megaOpen,
    setMegaOpen,

    mobileOpen,
    setMobileOpen,

    darkMode,
    setDarkMode,

    categories,
    featured,

    megaRef,
  };
}
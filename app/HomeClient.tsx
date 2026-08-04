'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  BadgePercent,
  CheckCircle2,
  Heart,
  ShieldCheck,
  Star,
  Truck,
  Wallet,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { formatARS } from '@/lib/currency';

export type ProductDTO = {
  _id: string;
  name: string;
  slug: string;
  description: string;
  image: string;
  price: number;
  oldPrice: number | null;
  discount: number | null;
  stock: number | null;
  rating: number | null;
  brand: string;
  category: string;
  tags: string[];
  featured: boolean;
  bestseller: boolean;
};

export type CategoryDTO = {
  _id: string;
  name: string;
  slug: string;
  image: string;
  description: string;
  productCount: number | null;
};

export type BannerDTO = {
  _id: string;
  title: string;
  subtitle: string;
  image: string;
  ctaLabel: string;
  ctaHref: string;
};

type Props = {
  initialProducts: ProductDTO[];
  initialCategories: CategoryDTO[];
  initialBanners: BannerDTO[];
};

const brands = ['Samsung', 'Apple', 'Xiaomi', 'Sony', 'Nike', 'Adidas', 'Logitech', 'HyperX'];

const currency = formatARS;

function getImage(src?: string) {
  if (!src || src.trim().length === 0) {
    return "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='300'%3E%3Crect fill='%23f0f0f0' width='400' height='300'/%3E%3Ctext x='50%25' y='50%25' font-size='24' fill='%23999' text-anchor='middle' dominant-baseline='middle'%3EProducto%3C/text%3E%3C/svg%3E";
  }
  return src;
}

function calcDiscount(product: ProductDTO) {
  if (product.discount != null && !Number.isNaN(product.discount)) return product.discount;
  if (product.oldPrice && product.oldPrice > product.price) {
    return Math.round(((product.oldPrice - product.price) / product.oldPrice) * 100);
  }
  return 0;
}

function clampRating(rating: number | null) {
  if (rating == null || Number.isNaN(rating)) return 0;
  return Math.max(0, Math.min(5, rating));
}

function getBestProducts(products: ProductDTO[]) {
  return [...products]
    .sort((a, b) => {
      const scoreA =
        (a.rating ?? 0) * 10 +
        (a.featured ? 5 : 0) +
        (a.bestseller ? 6 : 0) +
        (a.stock ?? 0) / 100;
      const scoreB =
        (b.rating ?? 0) * 10 +
        (b.featured ? 5 : 0) +
        (b.bestseller ? 6 : 0) +
        (b.stock ?? 0) / 100;
      return scoreB - scoreA;
    })
    .slice(0, 8);
}

function getDeals(products: ProductDTO[]) {
  return [...products]
    .filter((p) => calcDiscount(p) > 0 || (p.oldPrice ?? 0) > p.price)
    .sort((a, b) => calcDiscount(b) - calcDiscount(a))
    .slice(0, 8);
}

function SectionTitle({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="mb-8 flex flex-col gap-3">
      <span className="inline-flex w-fit items-center rounded-full border border-[#ff007f]/20 bg-[#ff007f]/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.3em] text-[#ff007f]">
        {eyebrow}
      </span>
      <h2 className="text-2xl font-black tracking-[-0.02em] text-neutral-950 sm:text-3xl">
        {title}
      </h2>
      <p className="max-w-2xl text-sm leading-6 text-neutral-600 sm:text-base">
        {description}
      </p>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="animate-pulse rounded-3xl border border-neutral-200 bg-white p-4 shadow-sm">
      <div className="h-52 rounded-2xl bg-neutral-200" />
      <div className="mt-4 h-4 w-2/3 rounded bg-neutral-200" />
      <div className="mt-3 h-4 w-1/2 rounded bg-neutral-200" />
      <div className="mt-5 h-10 rounded-full bg-neutral-200" />
    </div>
  );
}

function ProductCard({
  product,
  onAddToCart,
  isWishlisted,
  onToggleWishlist,
}: {
  product: ProductDTO;
  onAddToCart: (product: ProductDTO) => void;
  isWishlisted: boolean;
  onToggleWishlist: (productId: string) => void;
}) {
  const discount = calcDiscount(product);
  const rating = clampRating(product.rating);

  return (
    <article className="group rounded-[1.75rem] border border-neutral-200/80 bg-white p-4 shadow-[0_18px_60px_rgba(0,0,0,0.05)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_30px_90px_rgba(0,0,0,0.12)]">
      <Link href={`/product/${product.slug || product._id}`} className="block">
        <div className="relative aspect-square overflow-hidden rounded-[1.35rem] bg-neutral-100">
          {discount > 0 ? (
            <div className="absolute left-3 top-3 z-10 flex flex-col gap-2">
              <span className="rounded-full bg-[#ff007f] px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-white shadow">Oferta</span>
              <span className="rounded-full bg-white/90 px-2 py-0.5 text-[11px] font-semibold text-[#ff007f]">-{discount}%</span>
            </div>
          ) : null}
          {product.stock != null ? (
            <span className="absolute right-3 top-3 z-10 rounded-full bg-black/80 px-2.5 py-1 text-[11px] font-medium text-white">
              Stock {product.stock}
            </span>
          ) : null}
          <div className="absolute inset-0 bg-gradient-to-t from-black/10 via-transparent to-transparent opacity-0 transition duration-500 group-hover:opacity-100" />
          <Image
            src={getImage(product.image)}
            alt={product.name}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            unoptimized
          />
        </div>
      </Link>

      <div className="mt-4 space-y-2">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="line-clamp-2 text-sm font-semibold text-neutral-950">
              {product.name}
            </h3>
            <p className="mt-1 text-xs text-neutral-500">{product.brand || product.category}</p>
          </div>
          <button
            onClick={() => onToggleWishlist(product._id)}
            className="rounded-full border border-neutral-200 p-2 transition hover:border-[#ff007f] hover:bg-[#ff007f]/5"
            aria-label={isWishlisted ? 'Quitar de favoritos' : 'Agregar a favoritos'}
          >
            <Heart
              className={isWishlisted ? 'fill-[#ff007f] text-[#ff007f]' : 'text-neutral-700'}
              size={16}
            />
          </button>
        </div>

        <div className="flex items-center gap-2 text-sm">
          <div className="flex items-center gap-1 text-amber-500">
            <Star size={14} className="fill-amber-500 text-amber-500" />
            <span className="font-medium text-neutral-700">
              {rating ? rating.toFixed(1) : '4.8'}
            </span>
          </div>
          <span className="text-neutral-300">•</span>
          <span className="text-neutral-500">
            {product.stock != null ? `${product.stock} disponibles` : 'Disponible'}
          </span>
        </div>

        <div className="flex items-end justify-between gap-3 pt-1">
          <div>
            <div className="text-lg font-black text-neutral-950">{currency(product.price)}</div>
            {product.oldPrice && product.oldPrice > product.price ? (
              <div className="mt-1 flex items-center gap-3">
                <div className="text-xs text-neutral-400 line-through">{currency(product.oldPrice)}</div>
                <div className="text-xs font-semibold text-rose-600">Ahorra {currency(product.oldPrice - product.price)}</div>
              </div>
            ) : null}
          </div>

          <button
            onClick={() => onAddToCart(product)}
            className="inline-flex min-h-10 items-center justify-center rounded-full bg-[#ff007f] px-4 py-2 text-sm font-semibold text-black transition hover:-translate-y-0.5 hover:bg-[#ff007f]/90"
          >
            Agregar
          </button>
        </div>
      </div>
    </article>
  );
}

function BenefitCard({
  icon: Icon,
  title,
  text,
}: {
  icon: LucideIcon;
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm">
      <div className="inline-flex rounded-2xl bg-[#ff007f]/10 p-3 text-[#ff007f]">
        <Icon size={20} />
      </div>
      <h3 className="mt-4 text-base font-bold text-neutral-950">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-neutral-600">{text}</p>
    </div>
  );
}

function CategoryCard({ category }: { category: CategoryDTO }) {
  return (
    <Link
      href={`/category/${category.slug}`}
      className="group block overflow-hidden rounded-3xl border border-neutral-200 bg-white p-4 shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
    >
      <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-neutral-100">
        <Image
          src={getImage(category.image)}
          alt={category.name}
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-105"
          unoptimized
        />
      </div>
      <div className="mt-4 flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-neutral-950">{category.name}</h3>
          <p className="text-xs text-neutral-500">{category.productCount ?? 0} productos</p>
        </div>
        <ArrowRight size={18} className="text-[#ff007f] transition-transform group-hover:translate-x-1" />
      </div>
    </Link>
  );
}

export default function HomeClient({
  initialProducts,
  initialCategories,
  initialBanners,
}: Props) {
  const { addToCart } = useCart() as { addToCart?: (item: unknown) => void };

  const [wishlist, setWishlist] = useState<string[]>([]);
  const [email, setEmail] = useState('');
  const [notice, setNotice] = useState<string>('');

  useEffect(() => {
    let initialWishlist: string[] = [];
    try {
      const stored = localStorage.getItem('avgconnects:wishlist');
      if (stored) initialWishlist = JSON.parse(stored);
    } catch {
      initialWishlist = [];
    }
    queueMicrotask(() => setWishlist(initialWishlist));
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('avgconnects:wishlist', JSON.stringify(wishlist));
    } catch {
      // ignore
    }
  }, [wishlist]);

  const featuredProducts = useMemo(
    () => initialProducts.filter((p) => p.featured).slice(0, 8),
    [initialProducts],
  );
  const bestSellers = useMemo(() => getBestProducts(initialProducts), [initialProducts]);
  const deals = useMemo(() => getDeals(initialProducts), [initialProducts]);
  const heroBanner = initialBanners[0];
  const heroImage = heroBanner?.image || initialProducts[0]?.image || "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='1200' height='700'%3E%3Crect fill='%23000000' width='1200' height='700'/%3E%3Ccircle cx='900' cy='220' r='180' fill='%23ff007f'/%3E%3Ccircle cx='280' cy='500' r='220' fill='%2300d4ff'/%3E%3Ctext x='50%25' y='50%25' font-size='42' fill='white' text-anchor='middle' dominant-baseline='middle' font-family='Arial, sans-serif'%3EAVG Connects%3C/text%3E%3C/svg%3E";
  const featuredHeroProduct = initialProducts.find((product) => product.featured) ?? initialProducts[0];

  function showNotice(message: string) {
    setNotice(message);
    window.setTimeout(() => setNotice(''), 2200);
  }

  function handleAddToCart(product: ProductDTO) {
    const item = {
      _id: product._id,
      name: product.name,
      image: product.image,
      price: product.price,
      comparePrice: (product.oldPrice ?? null) as number | null,
      quantity: 1,
      slug: product.slug,
    };

    if (addToCart) {
      addToCart(item);
      showNotice(`${product.name} agregado al carrito`);
      return;
    }

    window.dispatchEvent(new CustomEvent('cart:add', { detail: item }));
    showNotice(`${product.name} agregado al carrito`);
  }

  function toggleWishlist(id: string) {
    setWishlist((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  }

  function submitNewsletter(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const valid = /\S+@\S+\.\S+/.test(email);
    showNotice(valid ? 'Gracias. Te suscribiste al newsletter.' : 'Ingresá un email válido.');
    if (valid) setEmail('');
    window.setTimeout(() => setNotice(''), 2200);
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(255,0,127,0.06),_transparent_28%),linear-gradient(180deg,_#fcfaf7_0%,_#f5f2eb_100%)] text-neutral-900">
      <div className="mx-auto max-w-[1600px] px-4 pb-20 pt-4 sm:px-6 lg:px-8">
        {notice ? (
          <div className="fixed right-4 top-4 z-[60] rounded-full border border-neutral-200 bg-white px-4 py-2 text-sm shadow-lg">
            {notice}
          </div>
        ) : null}

        <section className="relative overflow-hidden rounded-[2.2rem] border border-neutral-200/80 bg-neutral-950 text-white shadow-[0_30px_120px_rgba(0,0,0,0.16)]">
          <div className="absolute inset-0">
            <Image
              src={heroImage}
              alt="AVG Connects hero"
              fill
              priority
              className="object-cover opacity-35"
              unoptimized
            />
            <div className="absolute inset-0 bg-[linear-gradient(90deg,_rgba(0,0,0,0.92)_0%,_rgba(0,0,0,0.76)_48%,_rgba(0,0,0,0.42)_100%)]" />
          </div>

          <div className="absolute right-6 top-6 hidden items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.3em] text-white/85 backdrop-blur sm:flex">
            <span className="h-2 w-2 rounded-full bg-[#ff007f]" />
            Marketplace premium
          </div>

          <div className="relative grid min-h-[620px] items-center gap-10 px-6 py-12 sm:px-10 lg:grid-cols-[1.15fr_0.85fr] lg:px-14">
            <div>
              <span className="inline-flex items-center rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.3em] text-white/85 backdrop-blur">
                AVG Connects
              </span>
              <h1 className="mt-5 max-w-3xl text-4xl font-black leading-[0.95] tracking-[-0.03em] sm:text-5xl lg:text-6xl">
                Tecnología premium, ofertas reales y compra confiable.
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-7 text-white/78 sm:text-lg">
                Descubrí productos seleccionados, promociones atractivas y una experiencia de compra moderna, rápida y pensada para convertir visitas en ventas.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="#destacados"
                  className="inline-flex items-center justify-center rounded-full bg-[#ff007f] px-6 py-3.5 text-sm font-bold text-black transition hover:-translate-y-0.5 hover:bg-[#ff007f]/90"
                >
                  Comprar ahora
                </Link>
                <Link
                  href="#destacados"
                  className="inline-flex items-center justify-center rounded-full border border-white/15 bg-white/10 px-6 py-3.5 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-white/15"
                >
                  Explorar productos
                </Link>
              </div>

              <div className="mt-8 flex flex-wrap gap-2 text-sm text-white/80">
                <span className="rounded-full border border-white/10 bg-white/10 px-3 py-2 backdrop-blur">Envíos claros</span>
                <span className="rounded-full border border-white/10 bg-white/10 px-3 py-2 backdrop-blur">Pago seguro</span>
                <span className="rounded-full border border-white/10 bg-white/10 px-3 py-2 backdrop-blur">Soporte real</span>
              </div>
            </div>

            <div className="grid gap-4">
              <div className="rounded-[2rem] border border-white/10 bg-white/10 p-5 shadow-[0_20px_80px_rgba(0,0,0,0.2)] backdrop-blur-xl">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.3em] text-white/60">
                      Destacado de la semana
                    </p>
                    <h2 className="mt-2 text-2xl font-black tracking-[-0.02em]">
                      {heroBanner?.title || 'Las mejores ofertas'}
                    </h2>
                  </div>
                  <div className="rounded-2xl bg-[#ff007f] p-3 text-black">
                    <BadgePercent size={22} />
                  </div>
                </div>
                <p className="mt-3 max-w-md text-sm leading-6 text-white/72">
                  {heroBanner?.subtitle || 'Una experiencia visual pensada para destacar productos y aumentar la conversión.'}
                </p>
                <Link
                  href={heroBanner?.ctaHref || '#destacados'}
                  className="mt-5 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2.5 text-sm font-semibold text-neutral-950 transition hover:gap-3"
                >
                  {heroBanner?.ctaLabel || 'Ver más'} <ArrowRight size={16} />
                </Link>
              </div>

              <div className="rounded-[2rem] border border-white/10 bg-black/20 p-4 backdrop-blur-xl">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.3em] text-white/60">Producto recomendado</p>
                    <h3 className="mt-2 text-base font-bold text-white">{featuredHeroProduct?.name || 'Producto destacado'}</h3>
                  </div>
                  <div className="rounded-full bg-white/15 px-3 py-1 text-sm font-semibold text-white">
                    {currency(featuredHeroProduct?.price ?? 0)}
                  </div>
                </div>
                <div className="mt-4 relative h-40 overflow-hidden rounded-[1.4rem]">
                  <Image
                    src={getImage(featuredHeroProduct?.image)}
                    alt={featuredHeroProduct?.name || 'Producto destacado'}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="categorias" className="pt-20">
          <SectionTitle
            eyebrow="Categorías"
            title="Explorá colecciones destacadas"
            description="Accedé a categorías claras, visuales y pensadas para que la navegación se sienta rápida y ordenada."
          />
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
            {initialCategories.length > 0 ? (
              initialCategories.map((category) => (
                <CategoryCard key={category._id} category={category} />
              ))
            ) : (
              Array.from({ length: 4 }).map((_, index) => <SkeletonCard key={index} />)
            )}
          </div>
        </section>

        <section id="destacados" className="pt-20">
          <SectionTitle
            eyebrow="Productos destacados"
            title="Lo mejor para mostrar primero"
            description="Tarjetas listas para vender, con precio, stock, rating y acceso directo a favoritos y carrito."
          />
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
            {featuredProducts.length > 0 ? (
              featuredProducts.map((product) => (
                <ProductCard
                  key={product._id}
                  product={product}
                  onAddToCart={handleAddToCart}
                  isWishlisted={wishlist.includes(product._id)}
                  onToggleWishlist={toggleWishlist}
                />
              ))
            ) : (
              Array.from({ length: 4 }).map((_, index) => <SkeletonCard key={index} />)
            )}
          </div>
        </section>

        <section className="pt-16">
          <SectionTitle
            eyebrow="Más vendidos"
            title="Productos con mayor tracción"
            description="Una sección distinta a destacados para darle jerarquía visual a lo que más convierte."
          />
          <div className="grid gap-5 lg:grid-cols-2 xl:grid-cols-4">
            {bestSellers.length > 0 ? (
              bestSellers.map((product, index) => (
                <div
                  key={product._id}
                  className="rounded-3xl border border-neutral-200 bg-white p-4 shadow-sm"
                >
                  <div className="flex items-start gap-4">
                    <div className="relative h-24 w-24 overflow-hidden rounded-2xl bg-neutral-100">
                      <Image
                        src={getImage(product.image)}
                        alt={product.name}
                        fill
                        className="object-cover"
                        unoptimized
                      />
                    </div>
                    <div className="flex-1">
                      <div className="inline-flex rounded-full bg-neutral-900 px-2.5 py-1 text-xs font-bold text-white">
                        TOP {index + 1}
                      </div>
                      <h3 className="mt-2 line-clamp-2 text-sm font-semibold text-neutral-950">
                        {product.name}
                      </h3>
                      <p className="mt-1 text-sm font-black text-neutral-950">
                        {currency(product.price)}
                      </p>
                      <div className="mt-3 flex items-center gap-2 text-xs text-neutral-500">
                        <Star size={14} className="fill-amber-500 text-amber-500" />
                        {clampRating(product.rating).toFixed(1)}
                        <span>•</span>
                        {product.stock ?? 0} stock
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              Array.from({ length: 4 }).map((_, index) => <SkeletonCard key={index} />)
            )}
          </div>
        </section>

        <section className="pt-16">
          <SectionTitle
            eyebrow="Ofertas del día"
            title="Descuentos que resaltan sin ensuciar la vista"
            description="Ideal para empujar conversiones con una presentación clara del ahorro."
          />
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
            {deals.length > 0 ? (
              deals.map((product) => (
                <ProductCard
                  key={product._id}
                  product={product}
                  onAddToCart={handleAddToCart}
                  isWishlisted={wishlist.includes(product._id)}
                  onToggleWishlist={toggleWishlist}
                />
              ))
            ) : (
              <div className="col-span-full rounded-3xl border border-dashed border-neutral-300 bg-white p-10 text-center text-sm text-neutral-500">
                No hay ofertas cargadas todavía.
              </div>
            )}
          </div>
        </section>

        <section className="pt-16">
          <SectionTitle
            eyebrow="Marcas populares"
            title="Un bloque limpio para fortalecer confianza"
            description="Podés dejarlo estático o conectarlo a un endpoint de marcas más adelante."
          />
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4 xl:grid-cols-8">
            {brands.map((brand) => (
              <div
                key={brand}
                className="rounded-2xl border border-neutral-200 bg-white px-4 py-6 text-center text-sm font-semibold text-neutral-700 shadow-sm"
              >
                {brand}
              </div>
            ))}
          </div>
        </section>

        <section className="pt-16">
          <div className="overflow-hidden rounded-[2rem] border border-neutral-200 bg-neutral-950 text-white shadow-2xl">
            <div className="grid gap-0 lg:grid-cols-[1fr_0.9fr]">
              <div className="p-8 sm:p-10 lg:p-14">
                <span className="text-xs font-semibold uppercase tracking-[0.25em] text-white/60">
                  Banner promocional
                </span>
                <h2 className="mt-4 max-w-xl text-3xl font-black tracking-tight sm:text-4xl">
                  Lanzá campañas con una pieza visual fuerte.
                </h2>
                <p className="mt-4 max-w-xl text-sm leading-7 text-white/72">
                  Esta sección está pensada para promociones, fechas especiales o campañas de lanzamiento.
                </p>
                <Link
                  href="#newsletter"
                  className="mt-8 inline-flex items-center gap-2 rounded-full bg-[#ff007f] px-5 py-3 text-sm font-bold text-black transition hover:gap-3"
                >
                  Aprovechar ahora <ArrowRight size={16} />
                </Link>
              </div>
              <div className="relative min-h-[280px]">
                <Image
                  src={getImage(initialBanners[0]?.image || initialProducts[0]?.image)}
                  alt="Promo"
                  fill
                  className="object-cover"
                  unoptimized
                />
                <div className="absolute inset-0 bg-gradient-to-l from-black/10 via-black/20 to-black/40" />
              </div>
            </div>
          </div>
        </section>

        <section id="newsletter" className="pt-16">
          <div className="grid gap-6 rounded-[2rem] border border-neutral-200 bg-white p-6 shadow-sm lg:grid-cols-[1fr_0.8fr] lg:p-10">
            <div>
              <SectionTitle
                eyebrow="Newsletter"
                title="Capturá emails sin fricción"
                description="Formulario simple, claro y con un texto de confianza que no empuja de más."
              />
              <form
                onSubmit={submitNewsletter}
                className="flex flex-col gap-3 sm:flex-row"
              >
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  type="email"
                  placeholder="tu@email.com"
                  className="min-h-12 flex-1 rounded-full border border-neutral-300 bg-white px-4 text-sm outline-none transition focus:border-[#ff007f]"
                />
                <button className="inline-flex items-center justify-center rounded-full bg-[#ff007f] px-6 py-3 text-sm font-bold text-black transition hover:bg-[#ff007f]/90">
                  Suscribirme
                </button>
              </form>
              <p className="mt-3 text-xs text-neutral-500">
                Sin spam. Podés darte de baja cuando quieras.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-3xl bg-neutral-950 p-5 text-white">
                <Zap className="text-[#ff007f]" />
                <h3 className="mt-4 font-bold">Ofertas exclusivas</h3>
                <p className="mt-2 text-sm text-white/70">
                  Promociones y lanzamientos primero para los suscriptores.
                </p>
              </div>
              <div className="rounded-3xl bg-neutral-100 p-5 text-neutral-950">
                <ShieldCheck className="text-[#ff007f]" />
                <h3 className="mt-4 font-bold">Datos seguros</h3>
                <p className="mt-2 text-sm text-neutral-600">
                  Una experiencia clara, simple y confiable desde el primer paso.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="pt-16">
          <SectionTitle
            eyebrow="Beneficios"
            title="4 cards para dejar en claro la propuesta"
            description="Envío, garantía, pagos y soporte en una pieza visual ordenada y fácil de escanear."
          />
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            <BenefitCard
              icon={Truck}
              title="Envíos rápidos"
              text="Procesos pensados para reducir fricción y mejorar la percepción de servicio."
            />
            <BenefitCard
              icon={ShieldCheck}
              title="Garantía"
              text="Mostrá políticas claras para aumentar confianza en la compra."
            />
            <BenefitCard
              icon={Wallet}
              title="Pagos seguros"
              text="Una estructura lista para Mercado Pago, Stripe o el método que uses."
            />
            <BenefitCard
              icon={CheckCircle2}
              title="Soporte"
              text="Puntos de contacto visibles para acompañar al cliente antes y después de comprar."
            />
          </div>
        </section>

        <footer className="mt-16 rounded-[2rem] border border-neutral-200 bg-white p-8 shadow-sm sm:p-10">
          <div className="grid gap-10 md:grid-cols-2 xl:grid-cols-4">
            <div>
              <h3 className="text-lg font-black text-neutral-950">AVG Connects</h3>
              <p className="mt-3 text-sm leading-6 text-neutral-600">
                Ecommerce premium con una base visual sólida, rápida y lista para escalar.
              </p>
            </div>
            <div>
              <h4 className="font-bold text-neutral-950">Empresa</h4>
              <ul className="mt-4 space-y-2 text-sm text-neutral-600">
                <li><Link href="/about">Quiénes somos</Link></li>
                <li><Link href="/contacto">Contacto</Link></li>
                <li><Link href="/blog">Blog</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-neutral-950">Políticas</h4>
              <ul className="mt-4 space-y-2 text-sm text-neutral-600">
                <li><Link href="/privacidad">Privacidad</Link></li>
                <li><Link href="/terminos">Términos</Link></li>
                <li><Link href="/envios">Envíos y devoluciones</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-neutral-950">Redes</h4>
              <ul className="mt-4 space-y-2 text-sm text-neutral-600">
                <li><a href="#">Instagram</a></li>
                <li><a href="#">TikTok</a></li>
                <li><a href="#">WhatsApp</a></li>
              </ul>
            </div>
          </div>
        </footer>
      </div>
    </main>
  );
}

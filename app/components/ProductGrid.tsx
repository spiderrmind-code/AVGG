"use client";

import ProductCard, { Product } from "./ProductCard";
import { useEffect, useRef } from "react";


interface ProductGridProps {
  products: Product[];
}


export default function ProductGrid({
  products,
}: ProductGridProps) {
  const railRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const rail = railRef.current;
    if (!rail || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let animationFrame = 0;
    let lastTime = performance.now();
    let resumeTimer: number | undefined;
    let paused = false;
    let autoScrolling = false;
    let position = rail.scrollLeft;
    const previousScrollBehavior = rail.style.scrollBehavior;
    const previousScrollSnapType = rail.style.scrollSnapType;
    rail.style.scrollBehavior = "auto";
    rail.style.scrollSnapType = "none";

    const getLoopWidth = () => {
      const items = rail.querySelectorAll<HTMLElement>(".marketplace-product-card");
      const duplicate = items[products.length];
      return duplicate ? duplicate.offsetLeft - items[0].offsetLeft : 0;
    };

    const pauseTemporarily = () => {
      paused = true;
      autoScrolling = false;
      position = rail.scrollLeft;
      rail.style.scrollSnapType = "x mandatory";
      scheduleResume();
    };

    const scheduleResume = () => {
      window.clearTimeout(resumeTimer);
      resumeTimer = window.setTimeout(() => {
        position = rail.scrollLeft;
        paused = false;
        lastTime = performance.now();
        rail.style.scrollSnapType = "none";
      }, 2800);
    };

    const move = (time: number) => {
      const elapsed = Math.min(time - lastTime, 64);
      lastTime = time;
      const loopWidth = getLoopWidth();
      if (!paused && loopWidth > 0) {
        position += (elapsed * 24) / 1000;
        if (position >= loopWidth) position -= loopWidth;
        autoScrolling = true;
        rail.scrollLeft = position;
        autoScrolling = false;
      }
      animationFrame = window.requestAnimationFrame(move);
    };

    const handleScroll = () => {
      if (!autoScrolling) position = rail.scrollLeft;
    };

    rail.addEventListener("pointerdown", pauseTemporarily);
    rail.addEventListener("touchstart", pauseTemporarily, { passive: true });
    rail.addEventListener("wheel", pauseTemporarily, { passive: true });
    rail.addEventListener("keydown", pauseTemporarily);
    rail.addEventListener("mouseenter", pauseTemporarily);
    rail.addEventListener("pointerup", scheduleResume);
    rail.addEventListener("mouseleave", scheduleResume);
    rail.addEventListener("scroll", handleScroll, { passive: true });
    animationFrame = window.requestAnimationFrame(move);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      window.clearTimeout(resumeTimer);
      rail.style.scrollBehavior = previousScrollBehavior;
      rail.style.scrollSnapType = previousScrollSnapType;
      rail.removeEventListener("pointerdown", pauseTemporarily);
      rail.removeEventListener("touchstart", pauseTemporarily);
      rail.removeEventListener("wheel", pauseTemporarily);
      rail.removeEventListener("keydown", pauseTemporarily);
      rail.removeEventListener("mouseenter", pauseTemporarily);
      rail.removeEventListener("pointerup", scheduleResume);
      rail.removeEventListener("mouseleave", scheduleResume);
      rail.removeEventListener("scroll", handleScroll);
    };
  }, [products.length]);

  if (!products?.length) {
    return (
      <section className="ui-shell ui-section">
        <div className="ui-surface p-8 text-center">
          <p className="text-lg font-semibold text-neutral-950 dark:text-white">No hay productos disponibles.</p>
          <p className="mt-2 text-sm text-neutral-600 dark:text-zinc-300">Pronto incorporaremos nuevos lanzamientos a la colección.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="marketplace-product-grid ui-shell pb-12 sm:pb-16">
      <div className="marketplace-shelf-header mb-8 flex items-end justify-between gap-4">
        <div>
          <p className="section-label">Colección</p>
          <h3 className="section-title dark:text-white">Productos seleccionados</h3>
        </div>
        <div className="hidden items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] text-neutral-500 sm:flex">
          <span className="inline-flex h-2.5 w-2.5 rounded-full bg-[color:var(--color-success)]" />
          Disponible ahora
        </div>
      </div>
      <div
        ref={railRef}
        className="marketplace-product-grid-inner flex gap-3 sm:gap-4 lg:gap-5 xl:gap-6"
      >
        {[...products, ...products].map((product, index) => (
          <ProductCard key={`${product._id}-${index}`} product={product} />
        ))}
      </div>
    </section>
  );
}

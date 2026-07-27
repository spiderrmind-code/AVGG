'use client';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '@/providers/theme-provider';

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="rounded-full border border-black/10 bg-white/80 p-2.5 text-neutral-700 shadow-[0_10px_30px_rgba(0,0,0,0.05)] transition hover:bg-white dark:border-white/10 dark:bg-white/10 dark:text-zinc-100"
      aria-label="Toggle theme"
    >
      {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}

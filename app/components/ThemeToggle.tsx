'use client';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from '@/providers/theme-provider';

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="flex items-center gap-2 rounded-full border border-black/10 bg-white/80 px-3 py-2 text-sm font-medium text-neutral-700 shadow-[0_10px_30px_rgba(0,0,0,0.05)] transition hover:bg-white dark:border-white/10 dark:bg-white/10 dark:text-zinc-200 dark:hover:bg-white/15"
      aria-label={isDark ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}
    >
      {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      <span>{isDark ? 'Claro' : 'Oscuro'}</span>
    </button>
  );
}

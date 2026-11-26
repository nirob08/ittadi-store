'use client';

import { useEffect } from 'react';
import { Moon, Sun } from 'lucide-react';

const THEME_KEY = 'ittadi-theme';

function applyTheme(isDark: boolean) {
  const mode = isDark ? 'dark' : 'light';
  document.documentElement.dataset.theme = mode;
  document.documentElement.style.colorScheme = mode;
}

export default function ThemeToggle() {
  useEffect(() => {
    try {
      const savedTheme = window.localStorage.getItem(THEME_KEY);
      if (savedTheme === 'dark' || savedTheme === 'light') {
        applyTheme(savedTheme === 'dark');
        return;
      }
      const prefersDark =
        typeof window.matchMedia === 'function' &&
        window.matchMedia('(prefers-color-scheme: dark)').matches;
      applyTheme(prefersDark);
    } catch (error) {
      console.error('The saved display theme could not be loaded:', error);
      applyTheme(false);
    }
  }, []);

  const toggleTheme = () => {
    const nextDark = document.documentElement.dataset.theme !== 'dark';
    applyTheme(nextDark);
    try {
      window.localStorage.setItem(THEME_KEY, nextDark ? 'dark' : 'light');
    } catch (error) {
      console.error('The selected display theme could not be saved:', error);
    }
  };

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label="Toggle dark and light mode"
      title="Toggle dark and light mode"
      className="theme-toggle glass-control inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#c8ad74]/35 bg-[var(--bg-surface)] text-[#8c6e3b] shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-[#c8ad74] hover:shadow-md dark:text-[#e5d2ac] sm:h-10 sm:w-10"
    >
      <Moon size={16} aria-hidden="true" className="theme-icon-light transition-transform duration-200" />
      <Sun size={16} aria-hidden="true" className="theme-icon-dark transition-transform duration-200" />
    </button>
  );
}
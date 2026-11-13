'use client';

import { useEffect } from 'react';
import { Moon, Sun } from 'lucide-react';

const THEME_KEY = 'ittadi-theme';

export default function ThemeToggle() {
  useEffect(() => {
    try {
      const savedTheme = window.localStorage.getItem(THEME_KEY);
      const isDark = savedTheme === 'dark';
      document.documentElement.dataset.theme = isDark ? 'dark' : 'light';
    } catch (error) {
      console.error('The saved display theme could not be loaded:', error);
    }
  }, []);

  const toggleTheme = () => {
    const nextDark = document.documentElement.dataset.theme !== 'dark';
    document.documentElement.dataset.theme = nextDark ? 'dark' : 'light';
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
      className="theme-toggle inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#e5e2dc] bg-white/80 text-[#315b45] shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <Moon size={17} aria-hidden="true" className="theme-icon-light" />
      <Sun size={17} aria-hidden="true" className="theme-icon-dark" />
    </button>
  );
}

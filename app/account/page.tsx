import CustomerHub from '@/app/components/customer-hub';
import ThemeToggle from '@/app/components/theme-toggle';
import Link from 'next/link';

export const metadata = {
  title: 'My account | Ittadi',
  description: 'Manage your Ittadi profile, delivery details and orders.',
};

export default function AccountPage() {
  return (
    <div className="customer-hub-shell min-h-screen bg-[var(--bg-page)] text-[var(--text-primary)]">
      <header className="glass-nav sticky top-0 z-30 border-b border-[var(--border-subtle)] backdrop-blur-xl backdrop-saturate-150">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-3.5 sm:px-8">
          <Link href="/" className="flex items-center gap-3" aria-label="Ittadi home">
            <img src="/favicon.png" alt="" className="h-10 w-10 rounded-xl object-cover" />
            <div className="flex flex-col">
              <span className="brand-wordmark font-serif text-lg font-bold tracking-[0.2em]">
                ITTADI
              </span>
              <span className="text-[8px] font-semibold uppercase tracking-[0.28em] text-[#c8ad74]">
                Curated Living
              </span>
            </div>
          </Link>

          <nav
            aria-label="Account page navigation"
            className="flex items-center gap-4 text-xs font-semibold text-[var(--text-secondary)] sm:gap-7 sm:text-sm"
          >
            <Link href="/" className="transition hover:text-[var(--text-primary)]">
              Home
            </Link>
            <Link href="/#products" className="transition hover:text-[var(--text-primary)]">
              Shop
            </Link>
            <Link href="/#contact" className="hidden transition hover:text-[var(--text-primary)] sm:inline">
              Contact
            </Link>
          </nav>

          <ThemeToggle />
        </div>
      </header>

      <main className="pb-10">
        <div className="mx-auto max-w-7xl px-4 pt-7 sm:px-8 sm:pt-10">
          <p className="section-eyebrow text-[10px] font-bold uppercase tracking-[0.22em] text-[var(--text-muted)]">
            A little space that is yours
          </p>
          <h1 className="mt-2 font-serif text-3xl font-normal sm:text-4xl">My account</h1>
          <p className="mt-1.5 max-w-2xl text-xs leading-6 text-[var(--text-secondary)] sm:text-sm">
            Keep your details up to date, check your orders and get help whenever you need it.
          </p>
        </div>

        <CustomerHub checkoutItems={null} accountPage />
      </main>

      <footer className="border-t border-[var(--border-subtle)] bg-[var(--bg-surface)] py-6 text-center text-xs text-[var(--text-muted)]">
        © Ittadi Store. Crafted with care.
      </footer>
    </div>
  );
}
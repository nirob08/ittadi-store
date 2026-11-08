import CustomerHub from '@/app/components/customer-hub';
import Link from 'next/link';

export const metadata = {
  title: 'My account | Ittadi',
  description: 'Manage your Ittadi profile, delivery details and orders.',
};

export default function AccountPage() {
  return (
    <div className="min-h-screen bg-[#faf9f6]">
      <header className="border-b border-[#e9e6df] bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4 sm:px-8">
          <Link href="/" className="flex items-center gap-3" aria-label="Ittadi home">
            <img src="/favicon.png" alt="" className="h-10 w-10 rounded-xl object-cover" />
            <span className="text-xl font-black tracking-[0.18em] text-[#24352c]">ITTADI</span>
          </Link>
          <nav aria-label="Account page navigation" className="flex items-center gap-4 text-xs font-semibold text-slate-500 sm:gap-7 sm:text-sm">
            <Link href="/" className="transition hover:text-[#315b45]">Home</Link>
            <Link href="/#products" className="transition hover:text-[#315b45]">Shop</Link>
            <Link href="/#contact" className="hidden transition hover:text-[#315b45] sm:inline">Contact</Link>
          </nav>
        </div>
      </header>

      <main>
        <div className="mx-auto max-w-6xl px-5 pt-8 sm:px-8 sm:pt-12">
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#829078]">A little space that is yours</p>
          <h1 className="mt-2 font-serif text-3xl text-[#24352c] sm:text-4xl">My account</h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">Keep your details up to date, check your orders and get help whenever you need it.</p>
        </div>
        <CustomerHub
          checkoutItems={null}
          accountPage
        />
      </main>

      <footer className="border-t border-[#e9e6df] bg-white py-6 text-center text-xs text-slate-400">
        © Ittadi Store. Made with care.
      </footer>
    </div>
  );
}

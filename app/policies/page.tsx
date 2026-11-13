import Link from 'next/link';
import ThemeToggle from '@/app/components/theme-toggle';

export const metadata = {
  title: 'Delivery, returns & payments | Ittadi',
  description: 'Ittadi delivery charges, return window and payment information.',
};

export default function PoliciesPage() {
  return (
    <main className="min-h-screen bg-[#faf9f6] text-[#24352c]">
      <header className="glass-nav backdrop-blur-xl backdrop-saturate-150 sticky top-0 z-30 border-b border-[#e9e6df]">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 sm:px-8">
          <Link href="/" className="flex items-center gap-3" aria-label="Ittadi home">
            <img src="/favicon.png" alt="" className="h-10 w-10 rounded-xl object-cover" />
            <span className="text-xl font-black tracking-[0.18em]">ITTADI</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/" className="text-xs font-semibold text-[#315b45] hover:text-[#24352c]">Continue shopping</Link>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-5 py-10 sm:px-8 sm:py-16">
        <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#829078]">Helpful information</p>
        <h1 className="mt-2 font-serif text-4xl sm:text-5xl">Delivery, returns &amp; payments</h1>
        <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-500">Order details for customers across Bangladesh. If anything is unclear, contact our team before placing your order.</p>

        <div className="mt-9 grid gap-5">
          <section className="glass-panel backdrop-blur-2xl backdrop-saturate-150 rounded-3xl p-6 sm:p-8">
            <h2 className="font-serif text-2xl">ডেলিভারি / Delivery</h2>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl bg-[#f7f6f2] p-4">
                <h3 className="text-sm font-bold">ঢাকার মধ্যে · Inside Dhaka</h3>
                <p className="mt-2 text-2xl font-semibold text-[#315b45]">৳70</p>
              </div>
              <div className="rounded-2xl bg-[#f7f6f2] p-4">
                <h3 className="text-sm font-bold">ঢাকার বাইরে · Outside Dhaka</h3>
                <p className="mt-2 text-2xl font-semibold text-[#315b45]">৳120</p>
              </div>
            </div>
            <p className="mt-4 text-xs leading-5 text-slate-500">Checkout delivery charge is calculated from the district in your delivery address. Our team will confirm your order details.</p>
          </section>

          <section className="glass-panel backdrop-blur-2xl backdrop-saturate-150 rounded-3xl p-6 sm:p-8">
            <h2 className="font-serif text-2xl">ফেরত / বদল · Returns &amp; exchanges</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">পণ্য হাতে পাওয়ার ৭ দিনের মধ্যে দাগ, ভাঙা বা অন্য ক্ষতি দেখা গেলে order number ও পরিষ্কার ছবি দিয়ে support-এ জানান। যাচাইয়ের পর return বা exchange-এর পরবর্তী ধাপ জানানো হবে।</p>
            <p className="mt-3 text-sm leading-6 text-slate-600">If an item arrives stained, broken or otherwise damaged, contact support within 7 days of delivery with your order number and clear photos. We will review the issue and confirm the next steps for a return or exchange.</p>
            <p className="mt-3 text-xs leading-5 text-slate-500">অভিযোগের সাথে পণ্যের পরিষ্কার ছবি ও order number দিন। Include clear photos of the item and your order number with your request.</p>
          </section>

          <section className="glass-panel backdrop-blur-2xl backdrop-saturate-150 rounded-3xl p-6 sm:p-8">
            <h2 className="font-serif text-2xl">পেমেন্ট / Payments</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">Checkout-এ Cash on Delivery, manual bKash ও Nagad transfer পাওয়া যায়। bKash/Nagad নম্বর checkout-এ দেখানো হবে; payment করার পর TxnID দিন। Admin যাচাই না করা পর্যন্ত order pending থাকবে। SSLCOMMERZ gateway merchant credentials configure হলে secure online payment option-ও চালু হবে।</p>
            <p className="mt-3 text-sm leading-6 text-slate-600">Checkout supports Cash on Delivery and manual bKash/Nagad transfers. Use the number shown at checkout and submit your TxnID; the order stays pending until an admin verifies it. Secure SSLCOMMERZ checkout will be available once merchant credentials are configured.</p>
            <div className="mt-5 flex flex-wrap gap-3">
              <a href="https://wa.me/8801869662849" target="_blank" rel="noreferrer" className="rounded-full bg-[#24352c] px-5 py-3 text-xs font-bold text-white transition hover:bg-[#315b45]">WhatsApp support</a>
              <a href="mailto:ittadi4u@gmail.com" className="rounded-full border border-[#d9d5cc] px-5 py-3 text-xs font-bold text-[#315b45] transition hover:border-[#315b45]">Email support</a>
            </div>
          </section>
        </div>
      </div>

      <footer className="border-t border-[#e9e6df] bg-white py-6 text-center text-xs text-slate-400">© Ittadi Store. Made with care.</footer>
    </main>
  );
}

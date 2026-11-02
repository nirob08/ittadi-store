'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import {
  ArrowRight,
  Check,
  Headphones,
  Mail,
  MapPin,
  Minus,
  Phone,
  Plus,
  Search,
  ShieldCheck,
  ShoppingBag,
  ShoppingCart,
  Sparkles,
  Truck,
  X,
} from 'lucide-react';
import CustomerHub from '@/app/components/customer-hub';

type Product = {
  _id: string;
  name: string;
  category: string;
  price: number;
  oldPrice?: number;
  image: string;
  badge?: string;
  stock: number;
};

const categories = [
  'Aesthetic Light',
  'Artificial Flower',
  'Indoor Planters',
  'Gadget',
  'Wall Decor & Mirrors',
];
const orderNumber = '8801869662849';

export default function Home() {
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<Record<string, number>>({});
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [cartOpen, setCartOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [productError, setProductError] = useState('');
  const [adminLoginOpen, setAdminLoginOpen] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [adminLoginError, setAdminLoginError] = useState('');
  const [adminLoginPending, setAdminLoginPending] = useState(false);
  const [checkoutItems, setCheckoutItems] = useState<{ productId: string; quantity: number }[] | null>(null);
  const logoLastClick = useRef(0);

  useEffect(() => {
    let active = true;

    fetch('/api/products')
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok || !result.success) {
          throw new Error(result.error || 'Products could not be loaded.');
        }
        if (active) setProducts(result.data);
      })
      .catch((error: unknown) => {
        if (active) {
          setProductError(
            error instanceof Error ? error.message : 'Products could not be loaded.',
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const visibleProducts = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    return products.filter((product) => {
      const matchesCategory = category === 'All' || product.category === category;
      const matchesSearch =
        !normalizedSearch ||
        `${product.name} ${product.category}`.toLowerCase().includes(normalizedSearch);
      return matchesCategory && matchesSearch;
    });
  }, [category, products, search]);
  const availableCategories = useMemo(
    () => Array.from(new Set([...categories, ...products.map((product) => product.category)])),
    [products],
  );

  const cartItems = products.filter((product) => cart[product._id]);
  const cartCount = Object.values(cart).reduce((total, quantity) => total + quantity, 0);
  const cartTotal = cartItems.reduce(
    (total, product) => total + product.price * cart[product._id],
    0,
  );

  const updateCart = (productId: string, change: number) => {
    setCart((current) => {
      const nextQuantity = (current[productId] || 0) + change;
      if (nextQuantity <= 0) {
        const next = { ...current };
        delete next[productId];
        return next;
      }
      const product = products.find((item) => item._id === productId);
      if (change > 0 && product && nextQuantity > product.stock) return current;
      return { ...current, [productId]: nextQuantity };
    });
  };

  const orderLink = (items: Product[], quantities: Record<string, number>) => {
    const lines = items.map(
      (product) =>
        `${product.name} x ${quantities[product._id]} - ৳${product.price * quantities[product._id]}`,
    );
    const total = items.reduce(
      (sum, product) => sum + product.price * quantities[product._id],
      0,
    );
    const message = `Assalamu alaikum, I would like to order:\n${lines.join('\n')}\nTotal: ৳${total}`;
    return `https://wa.me/${orderNumber}?text=${encodeURIComponent(message)}`;
  };

  const startCheckout = (items: Product[], quantities: Record<string, number>) => {
    setCheckoutItems(items.map((product) => ({ productId: product._id, quantity: quantities[product._id] })));
    setCartOpen(false);
  };

  const openAdmin = () => {
    setAdminPassword('');
    setAdminLoginError('');
    setAdminLoginOpen(true);
  };

  const handleAdminLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAdminLoginError('');
    setAdminLoginPending(true);
    try {
      const response = await fetch('/api/admin/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: adminPassword }),
      });
      const result = await response.json();
      if (!response.ok) {
        setAdminLoginError(
          response.status === 401
            ? 'Wrong password. Please try again.'
            : result.error || `Admin login failed (HTTP ${response.status}).`,
        );
        return;
      }
      window.location.assign('/admin');
    } catch {
      setAdminLoginError('Could not reach this site’s API. Open the same localhost port shown by npm run dev, then try again.');
    } finally {
      setAdminLoginPending(false);
    }
  };

  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-[#faf9f6] text-slate-900">
      <div className="flex w-full flex-wrap items-center justify-between gap-2 bg-[#18251f] px-4 py-2 text-[10px] font-semibold tracking-wide text-white sm:px-7 sm:text-xs">
        <a className="underline decoration-white/40 underline-offset-4 hover:text-emerald-200" href="https://wa.me/880153410524?text=Assalamu%20alaikum%2C%20I%20would%20like%20to%20place%20an%20order." target="_blank" rel="noreferrer">
          WhatsApp order: +880 1534-10524
        </a>
        <div className="flex items-center gap-2">
          <span className="hidden sm:inline">Follow Ittadi</span>
          <a aria-label="Ittadi on Facebook" className="rounded-full p-1.5 transition hover:bg-white/10 hover:text-emerald-200" href={process.env.NEXT_PUBLIC_FACEBOOK_URL || 'https://www.facebook.com/'} target="_blank" rel="noreferrer"><FacebookIcon /></a>
          <a aria-label="Ittadi on Instagram" className="rounded-full p-1.5 transition hover:bg-white/10 hover:text-emerald-200" href={process.env.NEXT_PUBLIC_INSTAGRAM_URL || 'https://www.instagram.com/'} target="_blank" rel="noreferrer"><InstagramIcon /></a>
        </div>
      </div>

      <header className="sticky top-0 z-30 border-b border-[#e9e6df] bg-[#faf9f6]/95 backdrop-blur-xl">
        <div className="flex w-full flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-8 lg:flex-nowrap lg:px-12 lg:py-4">
          <button
            type="button"
            onClick={() => {
              const now = Date.now();
              if (now - logoLastClick.current < 500) {
                logoLastClick.current = 0;
                openAdmin();
                return;
              }
              logoLastClick.current = now;
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                void openAdmin();
              }
            }}
            className="group flex shrink-0 items-center gap-2 rounded-xl text-left"
            title="Double-click or double-tap for admin"
            aria-label="Ittadi home. Double-click, double-tap, or press Enter for admin login."
          >
            <img
              src="/favicon.png"
              alt=""
              draggable="false"
              className="h-10 w-10 rounded-xl object-cover shadow-sm transition-transform group-hover:scale-105 sm:h-12 sm:w-12"
            />
            <span className="text-xl font-black tracking-[0.18em] text-[#24352c] sm:text-2xl">ITTADI</span>
          </button>

          <nav aria-label="Main navigation" className="order-3 flex w-full items-center justify-center gap-6 text-xs font-semibold text-slate-600 sm:gap-8 lg:order-none lg:w-auto lg:justify-start lg:text-sm">
            <a href="#" className="text-[#315b45] hover:text-[#203c2e]">Home</a>
            <a href="#products" className="hover:text-[#315b45]">Shop</a>
            <a href="#about" className="hover:text-[#315b45]">Our promise</a>
            <a href="#contact" className="hover:text-[#315b45]">Contact</a>
          </nav>

          <div className="flex min-w-0 flex-1 items-center justify-end gap-2 sm:gap-3 lg:flex-none">
            <label className="flex min-w-0 max-w-[260px] flex-1 items-center gap-2 rounded-full border border-[#e9e6df] bg-white px-3 py-2 text-slate-400 shadow-sm sm:px-4 lg:w-60">
              <Search size={16} aria-hidden="true" />
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Find something lovely"
                aria-label="Search products"
                className="min-w-0 flex-1 bg-transparent text-xs text-slate-800 outline-none placeholder:text-slate-400 sm:text-sm"
              />
            </label>
            <button
              type="button"
              onClick={() => setCartOpen(true)}
              className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#24352c] text-white transition hover:bg-[#315b45]"
              aria-label={`Open shopping bag, ${cartCount} items`}
            >
              <ShoppingBag size={18} />
              {cartCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#d49a54] px-1 text-[10px] font-bold text-white">
                  {cartCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      <main>
        <section className="relative isolate overflow-hidden bg-[#24352c] text-white">
          <div className="absolute -right-20 top-0 -z-10 h-96 w-96 rounded-full bg-[#a7b49b]/20 blur-3xl" />
          <div className="absolute -bottom-48 left-0 -z-10 h-96 w-96 rounded-full bg-[#d49a54]/20 blur-3xl" />
          <div className="grid min-h-[520px] w-full items-center gap-10 px-5 py-20 sm:px-10 md:min-h-[610px] md:grid-cols-[1.05fr_0.95fr] md:py-24 lg:px-16">
            <div className="max-w-2xl">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-[10px] font-bold uppercase tracking-[0.2em] text-[#d9c7a6] sm:text-xs">
                <Sparkles size={14} /> Little things, lovely living
              </span>
              <h1 className="mt-7 text-5xl font-semibold leading-[1.05] tracking-tight sm:text-6xl lg:text-7xl">
                Make room for
                <span className="mt-1 block font-serif italic text-[#d9c7a6]">a little wonder.</span>
              </h1>
              <p className="mt-6 max-w-lg text-sm leading-7 text-white/70 sm:text-base">
                Find considered gifts, charming home details, and everyday delights chosen to make your space feel more like you.
              </p>
              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <a
                  href="#products"
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-[#d9c7a6] px-7 py-3.5 text-sm font-bold text-[#24352c] transition hover:bg-white"
                >
                  Explore the collection <ArrowRight size={16} />
                </a>
                <a
                  href="https://wa.me/880153410524?text=Assalamu%20alaikum%2C%20I%20would%20like%20to%20place%20an%20order."
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-white/25 px-7 py-3.5 text-sm font-semibold text-white transition hover:bg-white/10"
                >
                  <Phone size={16} /> WhatsApp to order
                </a>
              </div>
              <div className="mt-10 flex items-center gap-3 text-xs text-white/60">
                <span className="flex text-[#d9c7a6]" aria-label="5 out of 5 stars">★★★★★</span>
                Thoughtfully picked for your home
              </div>
            </div>
            <div className="relative mx-auto flex aspect-[4/3] w-full max-w-xl items-center justify-center overflow-hidden rounded-[2rem] border border-white/10 bg-gradient-to-br from-[#687967] via-[#d0b998] to-[#e9dfcf] shadow-2xl md:aspect-[5/4]">
              <div className="absolute inset-4 rounded-[1.5rem] border border-white/40" />
              <div className="relative flex h-[78%] w-[75%] flex-col items-center justify-center rounded-[48%_48%_18%_18%] bg-[#f2eadc]/70 shadow-[0_30px_70px_rgba(26,35,27,0.2)] backdrop-blur-sm">
                <Sparkles className="h-16 w-16 text-[#315b45] sm:h-20 sm:w-20" strokeWidth={1.2} />
                <span className="mt-5 font-serif text-3xl italic text-[#315b45] sm:text-4xl">Ittadi</span>
                <span className="mt-2 text-[9px] font-bold uppercase tracking-[0.35em] text-[#687967]">A lovely little find</span>
              </div>
              <div className="absolute bottom-7 left-7 rounded-2xl bg-white/85 px-4 py-3 text-[#24352c] shadow-lg backdrop-blur">
                <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#687967]">Make it yours</p>
                <p className="mt-1 font-serif text-lg">The joy is in the details</p>
              </div>
            </div>
          </div>
        </section>

        <section id="about" className="border-b border-[#e9e6df] bg-white">
          <div className="grid w-full grid-cols-1 divide-y divide-[#e9e6df] px-5 py-6 sm:grid-cols-3 sm:divide-x sm:divide-y-0 sm:px-10 lg:px-16">
            <div className="flex items-center gap-4 px-2 py-4 sm:px-6 sm:py-2">
              <Truck className="shrink-0 text-[#58745d]" size={22} />
              <div><h2 className="text-sm font-bold">Delivery nationwide</h2><p className="mt-1 text-xs text-slate-500">From our door to yours</p></div>
            </div>
            <div className="flex items-center gap-4 px-2 py-4 sm:px-6 sm:py-2">
              <ShieldCheck className="shrink-0 text-[#58745d]" size={22} />
              <div><h2 className="text-sm font-bold">Carefully selected</h2><p className="mt-1 text-xs text-slate-500">Quality in every little detail</p></div>
            </div>
            <div className="flex items-center gap-4 px-2 py-4 sm:px-6 sm:py-2">
              <Headphones className="shrink-0 text-[#58745d]" size={22} />
              <div><h2 className="text-sm font-bold">Here to help</h2><p className="mt-1 text-xs text-slate-500">Friendly support when you need us</p></div>
            </div>
          </div>
        </section>

        <section id="products" className="w-full px-5 py-16 sm:px-10 sm:py-20 lg:px-16">
          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-[0.24em] text-[#829078]">A little something for everyone</span>
              <h2 className="mt-3 font-serif text-4xl text-[#24352c] sm:text-5xl">The collection</h2>
            </div>
            <p className="max-w-md text-sm leading-6 text-slate-500">
              Explore our latest favourites and find the small details that make a house feel like home.
            </p>
          </div>

          <div className="mt-8 flex gap-2 overflow-x-auto pb-2">
            {['All', ...availableCategories].map((item) => (
              <button
                type="button"
                key={item}
                onClick={() => setCategory(item)}
                aria-pressed={category === item}
                className={`shrink-0 rounded-full border px-4 py-2 text-xs font-semibold transition ${
                  category === item
                    ? 'border-[#24352c] bg-[#24352c] text-white'
                    : 'border-[#e5e2dc] bg-white text-slate-600 hover:border-[#829078] hover:text-[#24352c]'
                }`}
              >
                {item}
              </button>
            ))}
          </div>

          {productError && (
            <p role="alert" className="mt-6 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {productError} Please refresh the page or contact us for help.
            </p>
          )}

          {loading ? (
            <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {[1, 2, 3, 4].map((item) => (
                <div key={item} className="aspect-[4/5] animate-pulse rounded-2xl bg-[#eeece6]" />
              ))}
            </div>
          ) : visibleProducts.length === 0 ? (
            <div className="mt-10 rounded-3xl border border-dashed border-[#d9d5cc] bg-white px-6 py-16 text-center">
              <ShoppingBag className="mx-auto text-[#829078]" size={28} />
              <p className="mt-4 font-serif text-2xl text-[#24352c]">
                {products.length === 0 ? 'Our shelves are getting ready.' : 'No little finds just yet.'}
              </p>
              <p className="mt-2 text-sm text-slate-500">
                {products.length === 0
                  ? 'Please check back soon for our first collection.'
                  : 'Try a different search or category.'}
              </p>
              {category !== 'All' && (
                <button type="button" onClick={() => setCategory('All')} className="mt-5 text-sm font-semibold text-[#58745d] underline underline-offset-4">
                  Browse all products
                </button>
              )}
            </div>
          ) : (
            <div className="mt-8 grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 sm:gap-x-5 lg:grid-cols-4 lg:gap-x-6 lg:gap-y-10">
              {visibleProducts.map((product) => (
                <article key={product._id} className="group min-w-0">
                  <div className="relative aspect-[4/4.7] overflow-hidden rounded-2xl bg-[#eeece6]">
                    {product.badge && (
                      <span className="absolute left-3 top-3 z-10 rounded-full bg-white/90 px-3 py-1 text-[9px] font-bold uppercase tracking-wider text-[#315b45] shadow-sm">
                        {product.badge}
                      </span>
                    )}
                    <img
                      src={product.image}
                      alt={product.name}
                      loading="lazy"
                      className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]"
                    />
                    {product.stock <= 0 && (
                      <div className="absolute inset-0 flex items-center justify-center bg-slate-900/45">
                        <span className="rounded-full bg-white px-4 py-2 text-xs font-bold text-slate-700">Sold out</span>
                      </div>
                    )}
                  </div>
                  <div className="px-1 pt-4">
                    <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-[#829078]">{product.category}</p>
                    <h3 className="mt-1.5 line-clamp-2 min-h-10 text-sm font-semibold text-[#24352c] sm:text-base">{product.name}</h3>
                    <div className="mt-3 flex items-center gap-2">
                      <span className="text-sm font-bold text-[#315b45]">৳ {product.price}</span>
                      {product.oldPrice && product.oldPrice > product.price && (
                        <span className="text-xs text-slate-400 line-through">৳ {product.oldPrice}</span>
                      )}
                    </div>
                    <div className="mt-4 flex gap-2">
                      <button
                        type="button"
                        disabled={product.stock <= 0}
                        onClick={() => updateCart(product._id, 1)}
                        className="flex min-w-0 flex-1 items-center justify-center gap-1.5 rounded-full border border-[#d9d5cc] px-2 py-2.5 text-[10px] font-bold text-[#315b45] transition hover:border-[#315b45] disabled:cursor-not-allowed disabled:opacity-40 sm:text-xs"
                      >
                        <Plus size={14} /> Add to bag
                      </button>
                      <button
                        type="button"
                        disabled={product.stock <= 0}
                        onClick={() => startCheckout([product], { [product._id]: 1 })}
                        className="flex min-w-0 flex-1 items-center justify-center rounded-full bg-[#24352c] px-2 py-2.5 text-[10px] font-bold text-white transition hover:bg-[#315b45] disabled:cursor-not-allowed disabled:bg-slate-400 sm:text-xs"
                      >
                        Buy now
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>

      <footer id="contact" className="bg-[#1e2d25] text-white">
        <div className="grid w-full gap-10 px-5 py-12 sm:grid-cols-2 sm:px-10 lg:grid-cols-[1.3fr_0.7fr_1fr] lg:px-16 lg:py-16">
          <div>
            <div className="flex items-center gap-3">
              <img src="/favicon.png" alt="" className="h-10 w-10 rounded-lg object-cover" />
              <span className="text-xl font-black tracking-[0.18em]">ITTADI</span>
            </div>
            <p className="mt-4 max-w-sm text-sm leading-6 text-white/60">
              Adding charm to your space &amp; life. Your trusted destination for gifts, home decor, and thoughtful finds.
            </p>
            <p className="mt-5 flex items-center gap-2 text-xs font-medium text-white/75"><Truck size={16} className="text-[#d9c7a6]" /> Delivery all over Bangladesh</p>
          </div>
          <div>
            <h2 className="text-xs font-bold uppercase tracking-[0.18em] text-[#d9c7a6]">Explore</h2>
            <div className="mt-4 flex flex-col gap-3 text-sm text-white/65">
              <a href="#products" className="hover:text-white">Shop collection</a>
              <a href="#about" className="hover:text-white">Our promise</a>
              <a href="mailto:ittadi4u@gmail.com" className="hover:text-white">Email us</a>
            </div>
          </div>
          <div>
            <h2 className="text-xs font-bold uppercase tracking-[0.18em] text-[#d9c7a6]">Come say hello</h2>
            <div className="mt-4 flex flex-col gap-3 text-sm text-white/65">
              <a className="flex items-start gap-2 hover:text-white" href="https://maps.google.com/?q=House-11,+Gate-2,+Boshoti+Housing,+Mirpur-2,+Dhaka" target="_blank" rel="noreferrer">
                <MapPin size={16} className="mt-0.5 shrink-0 text-[#d9c7a6]" /> House-11, Gate-2, Boshoti Housing, Mirpur-2, Dhaka
              </a>
              <a className="flex items-center gap-2 hover:text-white" href="https://wa.me/8801869662849" target="_blank" rel="noreferrer"><Phone size={16} className="text-[#d9c7a6]" /> WhatsApp: +880 1869-662849</a>
              <a className="flex items-center gap-2 hover:text-white" href="mailto:ittadi4u@gmail.com"><Mail size={16} className="text-[#d9c7a6]" /> ittadi4u@gmail.com</a>
            </div>
          </div>
        </div>
        <div className="border-t border-white/10 px-5 py-5 text-center text-xs text-white/45 sm:px-10">
          © Ittadi Store. Made with care.
        </div>
      </footer>

      {adminLoginOpen && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/55 px-4 py-8 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !adminLoginPending) setAdminLoginOpen(false);
          }}
        >
          <section aria-label="Admin sign in" aria-modal="true" role="dialog" className="w-full max-w-sm rounded-3xl border border-[#e9e6df] bg-[#faf9f6] p-6 shadow-2xl sm:p-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#829078]">Private workspace</p>
                <h2 className="mt-2 font-serif text-3xl text-[#24352c]">Admin sign in</h2>
              </div>
              <button
                type="button"
                onClick={() => setAdminLoginOpen(false)}
                disabled={adminLoginPending}
                aria-label="Close admin sign in"
                className="rounded-full p-2 text-slate-500 transition hover:bg-white disabled:opacity-40"
              >
                <X size={19} />
              </button>
            </div>
            <p className="mt-3 text-sm text-slate-500">Enter your password to open the product studio.</p>
            {adminLoginError && <p role="alert" className="mt-4 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{adminLoginError}</p>}
            <form onSubmit={handleAdminLogin} className="mt-6">
              <label htmlFor="store-admin-password" className="text-xs font-semibold text-[#47564b]">Admin password</label>
              <input
                id="store-admin-password"
                type="password"
                value={adminPassword}
                onChange={(event) => setAdminPassword(event.target.value)}
                autoComplete="current-password"
                autoFocus
                required
                className="mt-2 w-full rounded-xl border border-[#e5e2dc] bg-white px-4 py-3 text-sm text-[#24352c] outline-none transition placeholder:text-slate-400 focus:border-[#58745d] focus:ring-4 focus:ring-[#58745d]/10"
                placeholder="Enter your password"
              />
              <button
                type="submit"
                disabled={adminLoginPending}
                className="mt-4 w-full rounded-xl bg-[#24352c] px-5 py-3.5 text-sm font-bold text-white transition hover:bg-[#315b45] disabled:cursor-wait disabled:opacity-60"
              >
                {adminLoginPending ? 'Checking password…' : 'Open admin panel'}
              </button>
            </form>
          </section>
        </div>
      )}

      {cartOpen && (
        <div className="fixed inset-0 z-50 flex justify-end" role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setCartOpen(false);
        }}>
          <div className="absolute inset-0 bg-slate-950/45 backdrop-blur-sm" />
          <section aria-label="Shopping bag" aria-modal="true" role="dialog" className="relative flex h-full w-full max-w-md flex-col bg-[#faf9f6] shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#e9e6df] px-6 py-5">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#829078]">Your picks</p>
                <h2 className="mt-1 font-serif text-2xl text-[#24352c]">Shopping bag ({cartCount})</h2>
              </div>
              <button type="button" onClick={() => setCartOpen(false)} aria-label="Close shopping bag" className="rounded-full p-2 text-slate-500 hover:bg-white"><X size={20} /></button>
            </div>
            {cartItems.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
                <ShoppingCart size={32} className="text-[#829078]" />
                <p className="mt-4 font-serif text-2xl text-[#24352c]">Your bag is waiting.</p>
                <p className="mt-2 text-sm text-slate-500">Add something lovely from the collection.</p>
                <button type="button" onClick={() => { setCartOpen(false); document.getElementById('products')?.scrollIntoView({ behavior: 'smooth' }); }} className="mt-6 rounded-full bg-[#24352c] px-6 py-3 text-sm font-semibold text-white hover:bg-[#315b45]">
                  Browse the collection
                </button>
              </div>
            ) : (
              <>
                <div className="flex-1 space-y-4 overflow-y-auto p-6">
                  {cartItems.map((product) => (
                    <div key={product._id} className="flex gap-4 rounded-2xl bg-white p-3">
                      <img src={product.image} alt={product.name} className="h-20 w-20 rounded-xl object-cover" />
                      <div className="min-w-0 flex-1">
                        <h3 className="line-clamp-2 text-sm font-semibold text-[#24352c]">{product.name}</h3>
                        <p className="mt-1 text-sm font-bold text-[#315b45]">৳ {product.price}</p>
                        <div className="mt-2 flex items-center gap-3">
                          <button type="button" onClick={() => updateCart(product._id, -1)} aria-label={`Remove one ${product.name}`} className="rounded-full border border-[#e9e6df] p-1.5 hover:bg-[#faf9f6]"><Minus size={13} /></button>
                          <span className="min-w-4 text-center text-xs font-semibold">{cart[product._id]}</span>
                          <button type="button" onClick={() => updateCart(product._id, 1)} aria-label={`Add one ${product.name}`} disabled={cart[product._id] >= product.stock} className="rounded-full border border-[#e9e6df] p-1.5 hover:bg-[#faf9f6] disabled:opacity-40"><Plus size={13} /></button>
                        </div>
                      </div>
                      <span className="self-start text-sm font-bold text-[#24352c]">৳ {product.price * cart[product._id]}</span>
                    </div>
                  ))}
                </div>
                <div className="border-t border-[#e9e6df] bg-white p-6">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-slate-500">Subtotal</span>
                    <span className="text-lg font-bold text-[#24352c]">৳ {cartTotal}</span>
                  </div>
                  <p className="mt-2 text-xs text-slate-500">Delivery charges can be confirmed when you place your order.</p>
                  <button
                    type="button"
                    onClick={() => startCheckout(cartItems, cart)}
                    className="mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-[#24352c] px-5 py-3.5 text-sm font-bold text-white transition hover:bg-[#315b45]"
                  >
                    <Check size={17} /> Checkout &amp; track order
                  </button>
                  <a href={orderLink(cartItems, cart)} target="_blank" rel="noreferrer" className="mt-3 flex w-full items-center justify-center gap-2 rounded-full border border-[#d9d5cc] px-5 py-3 text-xs font-semibold text-[#315b45] transition hover:border-[#315b45]">
                    Or order via WhatsApp
                  </a>
                </div>
              </>
            )}
          </section>
        </div>
      )}
      <CustomerHub
        checkoutItems={checkoutItems}
        onCheckoutComplete={() => {
          setCart({});
          setCheckoutItems(null);
          void fetch('/api/products')
            .then((response) => response.json())
            .then((result) => {
              if (!result.success) throw new Error(result.error || 'Products could not be refreshed.');
              setProducts(result.data);
            })
            .catch((error: unknown) => {
              setProductError(error instanceof Error ? error.message : 'Products could not be refreshed.');
            });
        }}
        onCloseCheckout={() => setCheckoutItems(null)}
      />
    </div>
  );
}

function FacebookIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-[15px] w-[15px]" fill="currentColor">
      <path d="M13.5 21v-8.2h2.8l.4-3.2h-3.2V7.5c0-.9.3-1.6 1.6-1.6h1.7V3.1c-.3 0-1.3-.1-2.5-.1-2.5 0-4.2 1.5-4.2 4.3v2.3H7.3v3.2h2.8V21h3.4Z" />
    </svg>
  );
}

function InstagramIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-[15px] w-[15px]" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="3.5" y="3.5" width="17" height="17" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.7" cy="6.7" r="0.8" fill="currentColor" stroke="none" />
    </svg>
  );
}

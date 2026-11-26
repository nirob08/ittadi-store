'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  CircleUserRound,
  Headphones,
  Mail,
  MapPin,
  Minus,
  Phone,
  Plus,
  Search,
  ShieldCheck,
  Star,
  ShoppingBag,
  ShoppingCart,
  Sparkles,
  Truck,
  X,
} from 'lucide-react';
import CustomerHub from '@/app/components/customer-hub';
import ThemeToggle from '@/app/components/theme-toggle';
import { sampleProducts as sampleProductData } from '@/lib/sample-products';

type Product = {
  _id: string;
  name: string;
  category: string;
  price: number;
  oldPrice?: number;
  image: string;
  badge?: string;
  stock: number;
  isSample?: boolean;
  description?: string;
  video?: string;
  ratingAverage?: number;
  reviewCount?: number;
};

const sampleProducts: Product[] = sampleProductData.map((product, index) => ({
  ...product,
  _id: `sample-preview-${index}`,
  badge: 'Edition',
  stock: 10,
  isSample: true,
  ratingAverage: 0,
  reviewCount: 0,
}));

const categories = [
  'Aesthetic Light',
  'Artificial Flower',
  'Indoor Planters',
  'Gadget',
  'Wall Decor & Mirrors',
];

const orderNumber = '8801869662849';

export default function Home() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<Record<string, number>>({});
  const [cartHydrated, setCartHydrated] = useState(false);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [cartOpen, setCartOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [productError, setProductError] = useState('');
  const [adminLoginOpen, setAdminLoginOpen] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [adminLoginError, setAdminLoginError] = useState('');
  const [adminLoginPending, setAdminLoginPending] = useState(false);
  const [checkoutItems, setCheckoutItems] = useState<
    {
      productId: string;
      quantity: number;
      name: string;
      unitPrice: number;
      image: string;
    }[] | null
  >(null);
  const logoLastClick = useRef(0);

  useEffect(() => {
    let active = true;

    fetch('/api/products')
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok || !result.success) {
          throw new Error(result.error || 'Products could not be loaded.');
        }
        if (active) {
          setProducts(result.data);
          try {
            const savedCart = window.localStorage.getItem('ittadi-cart');
            if (savedCart) {
              const parsedCart: unknown = JSON.parse(savedCart);
              if (parsedCart && typeof parsedCart === 'object' && !Array.isArray(parsedCart)) {
                const productsById = new Map(
                  (result.data as Product[]).map((product) => [product._id, product]),
                );
                const restoredCart = Object.entries(parsedCart).reduce<Record<string, number>>(
                  (restored, [productId, quantity]) => {
                    const product = productsById.get(productId);
                    if (
                      product &&
                      Number.isInteger(quantity) &&
                      Number(quantity) > 0 &&
                      product.stock > 0
                    ) {
                      restored[productId] = Math.min(Number(quantity), product.stock, 20);
                    }
                    return restored;
                  },
                  {},
                );
                setCart(restoredCart);
              }
            }
          } catch (storageError) {
            console.error('The saved shopping bag could not be restored:', storageError);
          } finally {
            setCartHydrated(true);
          }
        }
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

  useEffect(() => {
    if (!cartHydrated) return;
    try {
      window.localStorage.setItem('ittadi-cart', JSON.stringify(cart));
    } catch (storageError) {
      console.error('The shopping bag could not be saved:', storageError);
    }
  }, [cart, cartHydrated]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (document.visibilityState !== 'visible') return;
      fetch('/api/products', { cache: 'no-store' })
        .then(async (response) => {
          const result = await response.json();
          if (!response.ok || !result.success) {
            throw new Error(result.error || 'Products could not be refreshed.');
          }
          setProducts(result.data);
          const productsById = new Map(
            (result.data as Product[]).map((product) => [product._id, product]),
          );
          setCart((current) =>
            Object.entries(current).reduce<Record<string, number>>((next, [id, quantity]) => {
              const product = productsById.get(id);
              if (product && product.stock > 0) next[id] = Math.min(quantity, product.stock, 20);
              return next;
            }, {}),
          );
          setProductError('');
        })
        .catch((error: unknown) => {
          setProductError(error instanceof Error ? error.message : 'Products could not be refreshed.');
        });
    }, 15000);
    return () => window.clearInterval(timer);
  }, []);

  const displayProducts = products.length > 0 ? products : sampleProducts;

  const visibleProducts = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    return displayProducts.filter((product) => {
      const matchesCategory = category === 'All' || product.category === category;
      const matchesSearch =
        !normalizedSearch ||
        `${product.name} ${product.category}`.toLowerCase().includes(normalizedSearch);
      return matchesCategory && matchesSearch;
    });
  }, [category, displayProducts, search]);

  const availableCategories = useMemo(
    () => Array.from(new Set([...categories, ...displayProducts.map((product) => product.category)])),
    [displayProducts],
  );

  const categoryCards = useMemo(() => {
    return availableCategories.map((catName) => {
      const matchingItems = displayProducts.filter((item) => item.category === catName);
      return {
        name: catName,
        count: matchingItems.length,
        image: matchingItems[0]?.image || displayProducts[0]?.image || '/favicon.png',
      };
    });
  }, [availableCategories, displayProducts]);

  const featuredLead = displayProducts[0];
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
      if (change > 0 && product && nextQuantity > Math.min(product.stock, 20)) return current;
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
    setCheckoutItems(
      items.map((product) => ({
        productId: product._id,
        quantity: quantities[product._id],
        name: product.name,
        unitPrice: product.price,
        image: product.image,
      })),
    );
    setCartOpen(false);
  };

  const openProduct = (product: Product) => {
    router.push(`/product/${product._id}`);
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
      router.push('/admin');
    } catch {
      setAdminLoginError(
        'Could not reach this site’s API. Open the same localhost port shown by npm run dev, then try again.',
      );
    } finally {
      setAdminLoginPending(false);
    }
  };

  const getDiscountPercent = (product: Product) => {
    if (!product.oldPrice || product.oldPrice <= product.price) return null;
    return Math.round(((product.oldPrice - product.price) / product.oldPrice) * 100);
  };

  return (
    <div className="storefront-shell min-h-screen w-full overflow-x-hidden bg-[#faf9f6] text-[#24352c] selection:bg-[#24352c] selection:text-[#faf9f6]">
      {/* Top Concierge Bar */}
      <div className="announcement-bar flex w-full flex-wrap items-center justify-between gap-2 border-b border-white/10 bg-[#18241d] px-4 py-2 text-[10px] font-medium uppercase tracking-[0.18em] text-[#e6dfd1] sm:px-8 lg:px-14">
        <a
          className="truncate transition hover:text-white"
          href="https://wa.me/880153410524?text=Assalamu%20alaikum%2C%20I%20would%20like%20to%20place%20an%20order."
          target="_blank"
          rel="noreferrer"
        >
          Concierge &amp; WhatsApp · +880 1534-10524
        </a>
        <div className="flex items-center gap-2.5">
          <span className="hidden text-white/60 sm:inline">Nationwide Dispatch</span>
          <a
            aria-label="Ittadi on Facebook"
            className="rounded-full p-1 text-white/80 transition hover:bg-white/10 hover:text-white"
            href={process.env.NEXT_PUBLIC_FACEBOOK_URL || 'https://www.facebook.com/ittadi4u'}
            target="_blank"
            rel="noreferrer"
          >
            <FacebookIcon />
          </a>
          <a
            aria-label="Ittadi on Instagram"
            className="rounded-full p-1 text-white/80 transition hover:bg-white/10 hover:text-white"
            href={process.env.NEXT_PUBLIC_INSTAGRAM_URL || 'https://www.instagram.com/ittadi4u/'}
            target="_blank"
            rel="noreferrer"
          >
            <InstagramIcon />
          </a>
        </div>
      </div>

      {/* Sticky Header */}
      <header className="glass-nav sticky top-0 z-30 border-b border-[#e8e3d8]/90 bg-[#faf9f6]/92 backdrop-blur-xl backdrop-saturate-150">
        <div className="flex w-full flex-wrap items-center justify-between gap-2.5 px-4 py-3 sm:px-8 lg:flex-nowrap lg:px-14 lg:py-4">
          {/* Brand Logo (Double-click/tap or Enter opens Admin Sign-in) */}
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
            className="group flex shrink-0 items-center gap-2.5 rounded-full py-0.5 text-left"
            title="Double-click or double-tap for admin"
            aria-label="Ittadi home. Double-click, double-tap, or press Enter for admin login."
          >
            <img
              src="/favicon.png"
              alt=""
              draggable="false"
              className="h-9 w-9 rounded-full border border-[#dfd9cc] object-cover transition-transform duration-300 group-hover:scale-105 sm:h-10 sm:w-10"
            />
            <div className="flex flex-col">
              <span className="brand-wordmark font-serif text-base font-semibold tracking-[0.2em] text-[#24352c] sm:text-xl">
                ITTADI
              </span>
              <span className="hidden text-[8px] font-semibold uppercase tracking-[0.28em] text-[#7c8875] sm:block">
                Edition No. 01
              </span>
            </div>
          </button>

          {/* Desktop Navigation */}
          <nav
            aria-label="Main navigation"
            className="main-nav-links hidden items-center gap-7 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#536258] lg:flex"
          >
            <a href="#" className="text-[#24352c] underline decoration-[#b79d72] underline-offset-8">
              Edition
            </a>
            <a href="#categories" className="transition hover:text-[#24352c]">
              Categories
            </a>
            <a href="#products" className="transition hover:text-[#24352c]">
              Collection
            </a>
            <a href="#about" className="transition hover:text-[#24352c]">
              Philosophy
            </a>
            <a href="#contact" className="transition hover:text-[#24352c]">
              Contact
            </a>
          </nav>

          {/* Utility Controls */}
          <div className="flex items-center gap-1.5 sm:gap-2.5">
            <label className="glass-control hidden items-center gap-2 rounded-full border border-[#e3ddd0] bg-white px-4 py-2 text-[#7c8875] transition focus-within:border-[#24352c] lg:flex lg:w-60">
              <Search size={15} aria-hidden="true" className="shrink-0" />
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search objects..."
                aria-label="Search products"
                className="min-w-0 flex-1 bg-transparent text-xs text-[#24352c] outline-none placeholder:text-[#989d92]"
              />
            </label>

            <Link
              href="/account"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Open customer account"
              className="glass-control flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-full border border-[#e3ddd0] bg-white px-2.5 text-[#24352c] transition hover:border-[#24352c] sm:h-10 sm:px-4"
            >
              <CircleUserRound size={16} />
              <span className="hidden text-[11px] font-semibold uppercase tracking-[0.14em] sm:inline">
                Account
              </span>
            </Link>

            <ThemeToggle />

            <button
              type="button"
              onClick={() => setCartOpen(true)}
              className="relative flex h-9 items-center justify-center gap-1.5 rounded-full bg-[#24352c] px-3 text-[#faf9f6] transition hover:bg-[#344b3f] sm:h-10 sm:px-4"
              aria-label={`Open shopping bag, ${cartCount} items`}
            >
              <ShoppingBag size={15} />
              <span className="text-[10px] font-bold uppercase tracking-[0.14em]">
                Bag{cartCount > 0 ? ` (${cartCount})` : ''}
              </span>
            </button>
          </div>

          {/* Mobile Search Bar */}
          <div className="w-full pt-1 lg:hidden">
            <label className="glass-control flex w-full items-center gap-2.5 rounded-xl border border-[#e3ddd0] bg-white px-3.5 py-2 text-[#7c8875] shadow-[0_2px_10px_rgba(36,53,44,0.03)] transition focus-within:border-[#24352c]">
              <Search size={15} aria-hidden="true" className="shrink-0 text-[#6e7969]" />
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search aesthetic lights, planters, decor..."
                aria-label="Search products"
                className="min-w-0 flex-1 bg-transparent text-xs text-[#24352c] outline-none placeholder:text-[#989d92]"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  aria-label="Clear search"
                  className="rounded-full p-0.5 text-[#7c8875] hover:text-[#24352c]"
                >
                  <X size={14} />
                </button>
              )}
            </label>
          </div>
        </div>
      </header>

      <main>
        {/* Hero Section */}
        <section className="hero-stage relative isolate overflow-hidden border-b border-[#e5dfd2] bg-[#f4f1ea] text-[#24352c]">
          <div className="hero-glow hero-glow-a" />
          <div className="hero-glow hero-glow-b" />
          <div className="hero-grid-pattern opacity-40" />

          <div className="relative z-10 grid w-full items-center gap-8 px-4 py-5 sm:gap-12 sm:px-10 sm:py-14 lg:min-h-[660px] lg:grid-cols-[1.12fr_0.88fr] lg:gap-16 lg:px-14 lg:py-20">
            {/* Mobile Compact Editorial Banner */}
            <div className="relative overflow-hidden rounded-3xl border border-[#dfd8c8] bg-[#1e2d25] text-white shadow-[0_18px_45px_-18px_rgba(24,36,29,0.35)] lg:hidden">
              <div className="grid grid-cols-[1.15fr_0.85fr] items-center">
                <div className="p-5 sm:p-7">
                  <span className="inline-block rounded-full bg-white/12 px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.2em] text-[#e5d2ac]">
                    Ittadi Edition
                  </span>
                  <h1 className="hero-title mt-3 font-serif text-2xl font-normal leading-tight text-white sm:text-4xl">
                    Timeless objects,
                    <span className="block italic text-[#e5d2ac]">crafted for living.</span>
                  </h1>
                  <p className="mt-2 line-clamp-2 text-[11px] leading-5 text-white/75 sm:text-xs">
                    Warm lighting, refined accents, and thoughtful everyday pieces.
                  </p>
                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <a
                      href="#products"
                      className="inline-flex items-center gap-1.5 rounded-full bg-[#e5d2ac] px-4 py-2 text-[10px] font-bold uppercase tracking-[0.14em] text-[#18241d] transition hover:bg-white"
                    >
                      Shop Now <ArrowRight size={12} />
                    </a>
                    <a
                      href="https://wa.me/880153410524?text=Assalamu%20alaikum%2C%20I%20would%20like%20to%20place%20an%20order."
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 rounded-full border border-white/25 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-white/90 transition hover:bg-white/10"
                    >
                      WhatsApp
                    </a>
                  </div>
                </div>

                <div className="relative h-full min-h-[196px] overflow-hidden bg-[#2b3e33] sm:min-h-[240px]">
                  {featuredLead?.image ? (
                    <img
                      src={featuredLead.image}
                      alt={featuredLead.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center p-4 text-center font-serif italic text-lg text-[#e5d2ac]">
                      Curated Living
                    </div>
                  )}
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#1e2d25]/45 via-transparent to-transparent" />
                </div>
              </div>
            </div>

            {/* Desktop Editorial Typography */}
            <div className="hidden max-w-2xl lg:block">
              <div className="inline-flex items-center gap-2.5 border-b border-[#c9bea8] pb-2 text-[10px] font-bold uppercase tracking-[0.28em] text-[#6d7965]">
                <Sparkles size={13} className="text-[#9e7d47]" />
                <span>Curated Objects for Quiet Spaces</span>
              </div>

              <h1 className="hero-title mt-7 font-serif text-6xl font-normal leading-[1.04] tracking-tight text-[#1e2d25] xl:text-[4.6rem]">
                Timeless objects,
                <span className="mt-1.5 block italic text-[#5c6d5c]">crafted for living.</span>
              </h1>

              <p className="hero-copy mt-6 max-w-lg text-base leading-7 text-[#58655c]">
                An edited selection of warm ambient lighting, sculptural decor, and everyday tactile pieces chosen to bring calm character into your home.
              </p>

              <div className="mt-9 flex flex-row items-center gap-3.5">
                <a
                  href="#products"
                  className="hero-primary-cta inline-flex items-center justify-center gap-2.5 rounded-full bg-[#24352c] px-8 py-3.5 text-xs font-semibold uppercase tracking-[0.18em] text-[#faf9f6] transition hover:bg-[#33493e]"
                >
                  <span>View the Edition</span>
                  <ArrowRight size={15} />
                </a>
                <a
                  href="https://wa.me/880153410524?text=Assalamu%20alaikum%2C%20I%20would%20like%20to%20place%20an%20order."
                  target="_blank"
                  rel="noreferrer"
                  className="hero-secondary-cta inline-flex items-center justify-center gap-2 rounded-full border border-[#cfc7b7] bg-white/75 px-7 py-3.5 text-xs font-semibold uppercase tracking-[0.16em] text-[#24352c] backdrop-blur-sm transition hover:border-[#24352c] hover:bg-white"
                >
                  <Phone size={14} />
                  <span>Order via WhatsApp</span>
                </a>
              </div>

              <div className="mt-11 flex flex-wrap items-center gap-x-8 gap-y-3 border-t border-[#e3ddd0] pt-6 text-[11px] uppercase tracking-[0.18em] text-[#6b766c]">
                <span>01 / Warm Lighting &amp; Decor</span>
                <span>02 / Thoughtful Gifting</span>
                <span>03 / Across Bangladesh</span>
              </div>
            </div>

            {/* Desktop Featured Showcase Card */}
            <div className="hero-showcase relative mx-auto hidden w-full max-w-lg lg:block">
              <div className="rounded-[2rem] border border-[#dfd8c8] bg-white/85 p-4 shadow-[0_24px_70px_-25px_rgba(36,53,44,0.18)] backdrop-blur-xl">
                <div className="relative aspect-[4/5] w-full overflow-hidden rounded-[1.5rem] bg-[#eae5da]">
                  {featuredLead?.image ? (
                    <img
                      src={featuredLead.image}
                      alt={featuredLead.name}
                      className="h-full w-full object-cover transition duration-700 hover:scale-[1.03]"
                    />
                  ) : (
                    <div className="flex h-full w-full flex-col items-center justify-center bg-[#e7e2d6] p-8 text-center">
                      <span className="text-[10px] font-bold uppercase tracking-[0.26em] text-[#7c8875]">
                        ITTADI ARCHIVE
                      </span>
                      <span className="mt-3 font-serif text-3xl italic text-[#24352c]">
                        Quietly refined
                      </span>
                    </div>
                  )}

                  <div className="absolute inset-x-3.5 bottom-3.5 flex items-end justify-between gap-4 rounded-2xl border border-white/40 bg-[#faf9f6]/92 p-4 text-[#24352c] shadow-lg backdrop-blur-md">
                    <div className="min-w-0">
                      <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-[#7c8875]">
                        Featured Piece
                      </p>
                      <p className="mt-1 truncate font-serif text-lg text-[#24352c]">
                        {featuredLead?.name || 'Signature Home Objects'}
                      </p>
                      {featuredLead && (
                        <p className="mt-0.5 text-xs font-semibold text-[#315b45]">
                          ৳ {featuredLead.price}
                        </p>
                      )}
                    </div>
                    {featuredLead && (
                      <button
                        type="button"
                        onClick={() => openProduct(featuredLead)}
                        aria-label={`Explore ${featuredLead.name}`}
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#24352c] text-white transition hover:bg-[#315b45]"
                      >
                        <ArrowUpRight size={17} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Category Showcase Grid */}
        <section id="categories" className="w-full border-b border-[#e8e3d8] bg-[#faf9f6] px-4 py-6 sm:px-10 sm:py-10 lg:px-14">
          <div className="flex items-center justify-between gap-4">
            <div>
              <span className="text-[9px] font-bold uppercase tracking-[0.24em] text-[#7c8875] sm:text-[10px]">
                Browse By Edit
              </span>
              <h2 className="mt-0.5 font-serif text-xl font-normal text-[#1e2d25] sm:text-2xl">
                Featured Categories
              </h2>
            </div>
            {category !== 'All' && (
              <button
                type="button"
                onClick={() => setCategory('All')}
                className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#315b45] underline underline-offset-4"
              >
                Reset ({category})
              </button>
            )}
          </div>

          <div className="mt-4 grid grid-cols-4 gap-2.5 sm:grid-cols-5 sm:gap-4">
            {categoryCards.slice(0, 5).map((cat) => {
              const active = category === cat.name;
              return (
                <button
                  key={cat.name}
                  type="button"
                  onClick={() => setCategory(active ? 'All' : cat.name)}
                  aria-pressed={active}
                  className={`group flex flex-col items-center rounded-2xl border p-2 text-center transition sm:p-3 ${
                    active
                      ? 'border-[#24352c] bg-[#24352c] text-white shadow-md'
                      : 'border-[#e6e1d5] bg-white text-[#24352c] hover:border-[#b79d72]'
                  }`}
                >
                  <div className="aspect-square w-full overflow-hidden rounded-xl bg-[#f2efe8]">
                    <img
                      src={cat.image}
                      alt={cat.name}
                      loading="lazy"
                      className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                    />
                  </div>
                  <span className="mt-2 line-clamp-1 text-[10px] font-semibold tracking-tight sm:text-xs">
                    {cat.name}
                  </span>
                  <span
                    className={`mt-0.5 text-[9px] ${
                      active ? 'text-[#e5d2ac]' : 'text-[#7c8875]'
                    }`}
                  >
                    {cat.count} {cat.count === 1 ? 'item' : 'items'}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {/* Promise Strip */}
        <section id="about" className="feature-strip-shell border-b border-[#e8e3d8] bg-[#faf9f6] px-4 py-6 sm:px-10 sm:py-8 lg:px-14">
          <div className="feature-strip grid w-full grid-cols-1 divide-y divide-[#e8e3d8] sm:grid-cols-3 sm:divide-x sm:divide-y-0">
            <div className="flex items-start gap-3.5 py-3 sm:px-6 sm:py-2 first:sm:pl-0">
              <Truck className="mt-0.5 shrink-0 text-[#4b6755]" size={19} strokeWidth={1.7} />
              <div>
                <h2 className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#24352c]">
                  Nationwide Delivery
                </h2>
                <p className="mt-0.5 text-[11px] leading-5 text-[#667269] sm:text-xs">
                  Carefully packed and dispatched across Bangladesh.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3.5 py-3 sm:px-6 sm:py-2">
              <ShieldCheck className="mt-0.5 shrink-0 text-[#4b6755]" size={19} strokeWidth={1.7} />
              <div>
                <h2 className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#24352c]">
                  Considered Selection
                </h2>
                <p className="mt-0.5 text-[11px] leading-5 text-[#667269] sm:text-xs">
                  Checked for finish, warmth, and everyday utility.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3.5 py-3 sm:px-6 sm:py-2 last:sm:pr-0">
              <Headphones className="mt-0.5 shrink-0 text-[#4b6755]" size={19} strokeWidth={1.7} />
              <div>
                <h2 className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#24352c]">
                  Personal Support
                </h2>
                <p className="mt-0.5 text-[11px] leading-5 text-[#667269] sm:text-xs">
                  Direct assistance for orders, gifting, and tracking.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Product Collection */}
        <section id="products" className="collection-section w-full px-4 py-10 sm:px-10 sm:py-20 lg:px-14">
          <div className="flex flex-col justify-between gap-4 border-b border-[#e6e1d5] pb-6 md:flex-row md:items-end">
            <div>
              <span className="section-eyebrow text-[10px] font-bold uppercase tracking-[0.26em] text-[#7c8875]">
                The Catalog
              </span>
              <h2 className="mt-2 font-serif text-3xl font-normal text-[#1e2d25] sm:text-5xl">
                Curated Collection
              </h2>
            </div>
            <p className="max-w-md text-xs leading-6 text-[#636f66] sm:text-sm">
              Discover pieces designed to soften a room, elevate a corner, or serve as a lasting gift.
            </p>
          </div>

          {/* Filter Pills */}
          <div className="mt-5 flex gap-2 overflow-x-auto pb-2">
            {['All', ...availableCategories].map((item) => (
              <button
                type="button"
                key={item}
                onClick={() => setCategory(item)}
                aria-pressed={category === item}
                className={`category-pill shrink-0 rounded-full border px-3.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] transition sm:px-4 sm:py-2 sm:text-[11px] ${
                  category === item
                    ? 'border-[#24352c] bg-[#24352c] text-[#faf9f6]'
                    : 'border-[#e2dcd0] bg-white text-[#57645a] hover:border-[#24352c] hover:text-[#24352c]'
                }`}
              >
                {item}
              </button>
            ))}
          </div>

          {productError && (
            <p role="alert" className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-700 sm:text-sm">
              {productError} Sample products are shown below for preview only.
            </p>
          )}

          {!loading && products.length === 0 && !productError && (
            <p className="mt-5 rounded-2xl border border-[#e6e1d5] bg-white px-4 py-3 text-xs text-[#5d6960] sm:text-sm">
              Preview listings are shown below. Publish the sample catalog from the admin panel to make them available for checkout.
            </p>
          )}

          {loading ? (
            <div className="mt-6 grid grid-cols-1 gap-3.5 sm:mt-10 sm:grid-cols-3 lg:grid-cols-4 lg:gap-6">
              {[1, 2, 3, 4].map((item) => (
                <div
                  key={item}
                  className="premium-card h-32 animate-pulse rounded-2xl border border-[#e8e3d8] bg-[#efece4] sm:aspect-[4/5] sm:h-auto"
                />
              ))}
            </div>
          ) : visibleProducts.length === 0 ? (
            <div className="mt-8 rounded-3xl border border-dashed border-[#d8d2c5] bg-white px-6 py-14 text-center">
              <ShoppingBag className="mx-auto text-[#7c8875]" size={26} />
              <p className="mt-3 font-serif text-2xl text-[#24352c]">
                {displayProducts.length === 0 ? 'Our shelves are getting ready.' : 'No matching objects found.'}
              </p>
              <p className="mt-1.5 text-xs text-[#667269] sm:text-sm">
                {displayProducts.length === 0
                  ? 'Please check back soon for our first collection.'
                  : 'Try clearing your search or switching categories.'}
              </p>
              {category !== 'All' && (
                <button
                  type="button"
                  onClick={() => setCategory('All')}
                  className="mt-4 text-xs font-semibold uppercase tracking-[0.16em] text-[#24352c] underline underline-offset-4"
                >
                  Show all objects
                </button>
              )}
            </div>
          ) : (
            <div className="mt-6 grid grid-cols-1 gap-3.5 sm:mt-10 sm:grid-cols-3 sm:gap-6 lg:grid-cols-4 lg:gap-7">
              {visibleProducts.map((product) => {
                const discountPercent = getDiscountPercent(product);
                return (
                  <article
                    key={product._id}
                    className="premium-card product-card group flex min-w-0 flex-row items-center gap-3.5 rounded-2xl border border-[#eae5da] bg-white p-2.5 transition hover:border-[#cfc7b7] sm:flex-col sm:items-stretch sm:justify-between sm:gap-0 sm:p-3.5"
                  >
                    <div>
                      <div className="product-image-frame relative h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-[#f2efe8] sm:aspect-[4/5] sm:h-auto sm:w-full">
                        {product.badge && (
                          <span className="product-badge hidden rounded-full border border-[#e4ddd0] bg-[#faf9f6]/95 px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.18em] text-[#24352c] sm:absolute sm:left-2.5 sm:top-2.5 sm:z-10 sm:inline-block">
                            {product.badge}
                          </span>
                        )}
                        {discountPercent && (
                          <span className="hidden rounded-full bg-[#24352c] px-2 py-0.5 text-[9px] font-bold text-[#e5d2ac] sm:absolute sm:right-2.5 sm:top-2.5 sm:z-10 sm:inline-block">
                            -{discountPercent}%
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => openProduct(product)}
                          aria-label={`View ${product.name} details`}
                          className="h-full w-full text-left"
                        >
                          <img
                            src={product.image}
                            alt={product.name}
                            loading="lazy"
                            className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]"
                          />
                        </button>
                        {product.stock <= 0 && (
                          <div className="absolute inset-0 flex items-center justify-center bg-[#18241d]/55 backdrop-blur-[1px]">
                            <span className="rounded-full bg-[#faf9f6] px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.16em] text-[#24352c] sm:px-4 sm:py-1.5 sm:text-[10px]">
                              Sold Out
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="product-card-info hidden sm:block sm:px-1 sm:pt-4">
                        <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#838e7c]">
                          {product.category}
                        </p>
                        <h3 className="mt-1.5 line-clamp-2 min-h-10 font-serif text-lg font-medium leading-snug text-[#1e2d25]">
                          <button
                            type="button"
                            onClick={() => openProduct(product)}
                            className="text-left transition hover:text-[#4b6755]"
                          >
                            {product.name}
                          </button>
                        </h3>

                        <button
                          type="button"
                          onClick={() => openProduct(product)}
                          className="mt-1.5 inline-flex items-center gap-1 text-[10px] font-medium text-[#6c786e] hover:text-[#24352c] hover:underline"
                        >
                          {product.reviewCount ? (
                            <>
                              <Star size={11} className="fill-[#c69f63] text-[#c69f63]" />
                              {product.ratingAverage?.toFixed(1)} ({product.reviewCount})
                            </>
                          ) : (
                            <>View details</>
                          )}
                        </button>

                        <div className="mt-3 flex items-baseline gap-2">
                          <span className="text-base font-bold text-[#24352c]">
                            ৳ {product.price}
                          </span>
                          {product.oldPrice && product.oldPrice > product.price && (
                            <span className="text-xs text-[#9b9f96] line-through">
                              ৳ {product.oldPrice}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Mobile Compact Row Content */}
                    <div className="flex min-w-0 flex-1 flex-col justify-between sm:hidden">
                      <div>
                        <div className="flex items-center justify-between gap-2">
                          <p className="truncate text-[9px] font-bold uppercase tracking-[0.18em] text-[#838e7c]">
                            {product.category}
                          </p>
                          {(discountPercent || product.badge) && (
                            <span className="shrink-0 rounded-full bg-[#f4f1ea] px-2 py-0.5 text-[8px] font-bold uppercase tracking-[0.14em] text-[#315b45]">
                              {discountPercent ? `-${discountPercent}%` : product.badge}
                            </span>
                          )}
                        </div>
                        <h3 className="mt-1 line-clamp-1 font-serif text-sm font-medium text-[#1e2d25]">
                          <button
                            type="button"
                            onClick={() => openProduct(product)}
                            className="text-left transition hover:text-[#4b6755]"
                          >
                            {product.name}
                          </button>
                        </h3>
                        <div className="mt-1 flex items-center justify-between gap-2">
                          <div className="flex items-baseline gap-1.5">
                            <span className="text-xs font-bold text-[#24352c]">
                              ৳ {product.price}
                            </span>
                            {product.oldPrice && product.oldPrice > product.price && (
                              <span className="text-[10px] text-[#9b9f96] line-through">
                                ৳ {product.oldPrice}
                              </span>
                            )}
                          </div>
                          {product.reviewCount ? (
                            <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-[#6c786e]">
                              <Star size={10} className="fill-[#c69f63] text-[#c69f63]" />
                              {product.ratingAverage?.toFixed(1)}
                            </span>
                          ) : null}
                        </div>
                      </div>

                      <div className="mt-2.5">
                        {product.isSample ? (
                          <p className="rounded-full bg-[#f4f1ea] px-2.5 py-1.5 text-center text-[9px] font-medium text-[#6c786e]">
                            Preview · Publish from Admin
                          </p>
                        ) : (
                          <div className="flex gap-1.5">
                            <button
                              type="button"
                              disabled={product.stock <= 0}
                              onClick={() => updateCart(product._id, 1)}
                              className="flex min-w-0 flex-1 items-center justify-center gap-1 rounded-full border border-[#d6d0c2] px-2 py-1.5 text-[9px] font-bold uppercase tracking-[0.1em] text-[#24352c] transition hover:border-[#24352c] hover:bg-[#faf9f6] disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              <Plus size={12} /> Bag
                            </button>
                            <button
                              type="button"
                              disabled={product.stock <= 0}
                              onClick={() => startCheckout([product], { [product._id]: 1 })}
                              className="flex min-w-0 flex-1 items-center justify-center rounded-full bg-[#24352c] px-2 py-1.5 text-[9px] font-bold uppercase tracking-[0.1em] text-white transition hover:bg-[#344b3f] disabled:cursor-not-allowed disabled:bg-slate-400"
                            >
                              Buy now
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Desktop Action Footer */}
                    <div className="hidden sm:block sm:px-1 sm:pt-4">
                      {product.isSample ? (
                        <p className="rounded-full bg-[#f4f1ea] px-3 py-2.5 text-center text-[10px] font-medium text-[#6c786e]">
                          Preview · Publish from Admin
                        </p>
                      ) : (
                        <div className="flex gap-2">
                          <button
                            type="button"
                            disabled={product.stock <= 0}
                            onClick={() => updateCart(product._id, 1)}
                            className="flex min-w-0 flex-1 items-center justify-center gap-1 rounded-full border border-[#d6d0c2] px-2.5 py-2.5 text-[10px] font-bold uppercase tracking-[0.12em] text-[#24352c] transition hover:border-[#24352c] hover:bg-[#faf9f6] disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            <Plus size={13} /> Bag
                          </button>
                          <button
                            type="button"
                            disabled={product.stock <= 0}
                            onClick={() => startCheckout([product], { [product._id]: 1 })}
                            className="flex min-w-0 flex-1 items-center justify-center rounded-full bg-[#24352c] px-2.5 py-2.5 text-[10px] font-bold uppercase tracking-[0.12em] text-white transition hover:bg-[#344b3f] disabled:cursor-not-allowed disabled:bg-slate-400"
                          >
                            Buy now
                          </button>
                        </div>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </main>

      {/* Editorial Footer */}
      <footer id="contact" className="border-t border-[#ded7c8] bg-[#18241d] text-[#faf9f6]">
        <div className="grid w-full gap-8 px-5 py-12 sm:grid-cols-2 sm:gap-10 sm:px-10 lg:grid-cols-[1.35fr_0.75fr_1fr] lg:px-14 lg:py-16">
          <div>
            <div className="flex items-center gap-3">
              <img
                src="/favicon.png"
                alt=""
                className="h-9 w-9 rounded-full border border-white/15 object-cover"
              />
              <span className="font-serif text-xl tracking-[0.22em] text-white">ITTADI</span>
            </div>
            <p className="mt-3.5 max-w-sm text-xs leading-6 text-white/65 sm:text-sm">
              Adding quiet charm to your space &amp; daily ritual. Thoughtfully curated home accents, lighting, and gifts across Bangladesh.
            </p>
            <p className="mt-4 flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.16em] text-[#d9c7a6]">
              <Truck size={15} /> Delivery all over Bangladesh
            </p>
          </div>

          <div>
            <h2 className="text-[10px] font-bold uppercase tracking-[0.24em] text-[#d9c7a6]">
              Navigation
            </h2>
            <div className="mt-3.5 flex flex-col gap-2.5 text-xs text-white/70 sm:text-sm">
              <a href="#products" className="transition hover:text-white">
                Curated collection
              </a>
              <a href="#about" className="transition hover:text-white">
                Our philosophy
              </a>
              <Link href="/policies" className="transition hover:text-white">
                Delivery &amp; returns
              </Link>
              <Link
                href="/account"
                target="_blank"
                rel="noopener noreferrer"
                className="text-left transition hover:text-white"
              >
                My account &amp; orders
              </Link>
              <a href="mailto:ittadi4u@gmail.com" className="transition hover:text-white">
                Email concierge
              </a>
            </div>
          </div>

          <div>
            <h2 className="text-[10px] font-bold uppercase tracking-[0.24em] text-[#d9c7a6]">
              Atelier &amp; Contact
            </h2>
            <div className="mt-3.5 flex flex-col gap-3 text-xs text-white/70 sm:text-sm">
              <a
                className="flex items-start gap-2.5 transition hover:text-white"
                href="https://maps.google.com/?q=House-11,+Gate-2,+Boshoti+Housing,+Mirpur-2,+Dhaka"
                target="_blank"
                rel="noreferrer"
              >
                <MapPin size={15} className="mt-0.5 shrink-0 text-[#d9c7a6]" />
                <span>House-11, Gate-2, Boshoti Housing, Mirpur-2, Dhaka</span>
              </a>
              <a
                className="flex items-center gap-2.5 transition hover:text-white"
                href="https://wa.me/8801869662849"
                target="_blank"
                rel="noreferrer"
              >
                <Phone size={15} className="shrink-0 text-[#d9c7a6]" />
                <span>WhatsApp: +880 1869-662849</span>
              </a>
              <a
                className="flex items-center gap-2.5 transition hover:text-white"
                href="mailto:ittadi4u@gmail.com"
              >
                <Mail size={15} className="shrink-0 text-[#d9c7a6]" />
                <span>ittadi4u@gmail.com</span>
              </a>
            </div>
          </div>
        </div>

        <div className="border-t border-white/10 px-5 py-5 text-center text-[11px] tracking-[0.14em] text-white/45 sm:px-10">
          © Ittadi Store. Crafted with care.
        </div>
      </footer>

      {/* Hidden Admin Login Modal */}
      {adminLoginOpen && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/55 px-4 py-8 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !adminLoginPending) {
              setAdminLoginOpen(false);
            }
          }}
        >
          <section
            aria-label="Admin sign in"
            aria-modal="true"
            role="dialog"
            className="glass-panel w-full max-w-sm rounded-3xl border border-[#e3ddd0] bg-[#faf9f6] p-6 shadow-2xl backdrop-blur-2xl sm:p-8"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#7c8875]">
                  Private workspace
                </p>
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
            <p className="mt-3 text-xs leading-6 text-slate-500 sm:text-sm">
              Enter your password to open the product studio.
            </p>
            {adminLoginError && (
              <p role="alert" className="mt-4 rounded-xl bg-rose-50 px-4 py-3 text-xs text-rose-700 sm:text-sm">
                {adminLoginError}
              </p>
            )}
            <form onSubmit={handleAdminLogin} className="mt-6">
              <label htmlFor="store-admin-password" className="text-xs font-semibold text-[#47564b]">
                Admin password
              </label>
              <input
                id="store-admin-password"
                type="password"
                value={adminPassword}
                onChange={(event) => setAdminPassword(event.target.value)}
                autoComplete="current-password"
                autoFocus
                required
                className="mt-2 w-full rounded-xl border border-[#e3ddd0] bg-white px-4 py-3 text-sm text-[#24352c] outline-none transition placeholder:text-slate-400 focus:border-[#24352c] focus:ring-4 focus:ring-[#24352c]/10"
                placeholder="Enter your password"
              />
              <button
                type="submit"
                disabled={adminLoginPending}
                className="mt-4 w-full rounded-full bg-[#24352c] px-5 py-3.5 text-xs font-bold uppercase tracking-[0.16em] text-white transition hover:bg-[#315b45] disabled:cursor-wait disabled:opacity-60"
              >
                {adminLoginPending ? 'Checking password…' : 'Open admin panel'}
              </button>
            </form>
          </section>
        </div>
      )}

      {/* Slide-over Shopping Bag Drawer */}
      {cartOpen && (
        <div
          className="fixed inset-0 z-50 flex justify-end"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setCartOpen(false);
          }}
        >
          <div className="absolute inset-0 bg-slate-950/45 backdrop-blur-sm" />
          <section
            aria-label="Shopping bag"
            aria-modal="true"
            role="dialog"
            className="glass-panel relative flex h-full w-full max-w-md flex-col border-l border-[#e6e1d5] bg-[#faf9f6] shadow-2xl backdrop-blur-2xl"
          >
            <div className="flex items-center justify-between border-b border-[#e6e1d5] px-6 py-5">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#7c8875]">
                  Selected objects
                </p>
                <h2 className="mt-1 font-serif text-2xl text-[#24352c]">
                  Shopping bag ({cartCount})
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setCartOpen(false)}
                aria-label="Close shopping bag"
                className="rounded-full p-2 text-slate-500 transition hover:bg-white"
              >
                <X size={20} />
              </button>
            </div>

            {cartItems.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
                <ShoppingCart size={30} className="text-[#7c8875]" />
                <p className="mt-4 font-serif text-2xl text-[#24352c]">Your bag is empty.</p>
                <p className="mt-2 text-xs leading-6 text-slate-500 sm:text-sm">
                  Explore the collection and add pieces you love.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setCartOpen(false);
                    document.getElementById('products')?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="mt-6 rounded-full bg-[#24352c] px-6 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-white transition hover:bg-[#315b45]"
                >
                  Browse collection
                </button>
              </div>
            ) : (
              <>
                <div className="flex-1 space-y-4 overflow-y-auto p-6">
                  {cartItems.map((product) => (
                    <div
                      key={product._id}
                      className="flex gap-4 rounded-2xl border border-[#ece7dc] bg-white p-3"
                    >
                      <img
                        src={product.image}
                        alt={product.name}
                        className="h-20 w-20 rounded-xl object-cover"
                      />
                      <div className="min-w-0 flex-1">
                        <h3 className="line-clamp-2 font-serif text-sm font-medium text-[#24352c]">
                          {product.name}
                        </h3>
                        <p className="mt-1 text-xs font-bold text-[#315b45]">৳ {product.price}</p>
                        <div className="mt-2.5 flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => updateCart(product._id, -1)}
                            aria-label={`Remove one ${product.name}`}
                            className="rounded-full border border-[#e3ddd0] p-1.5 transition hover:bg-[#faf9f6]"
                          >
                            <Minus size={12} />
                          </button>
                          <span className="min-w-4 text-center text-xs font-semibold">
                            {cart[product._id]}
                          </span>
                          <button
                            type="button"
                            onClick={() => updateCart(product._id, 1)}
                            aria-label={`Add one ${product.name}`}
                            disabled={cart[product._id] >= Math.min(product.stock, 20)}
                            className="rounded-full border border-[#e3ddd0] p-1.5 transition hover:bg-[#faf9f6] disabled:opacity-40"
                          >
                            <Plus size={12} />
                          </button>
                        </div>
                      </div>
                      <span className="self-start text-xs font-bold text-[#24352c] sm:text-sm">
                        ৳ {product.price * cart[product._id]}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="border-t border-[#e6e1d5] bg-white p-6">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-slate-500">Subtotal</span>
                    <span className="font-serif text-xl font-semibold text-[#24352c]">
                      ৳ {cartTotal}
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-slate-500">
                    Delivery charges are confirmed when placing your order.
                  </p>
                  <button
                    type="button"
                    onClick={() => startCheckout(cartItems, cart)}
                    className="mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-[#24352c] px-5 py-3.5 text-xs font-bold uppercase tracking-[0.16em] text-white transition hover:bg-[#315b45]"
                  >
                    <Check size={16} /> Checkout &amp; track order
                  </button>
                  <a
                    href={orderLink(cartItems, cart)}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-3 flex w-full items-center justify-center gap-2 rounded-full border border-[#d8d2c5] px-5 py-3 text-xs font-semibold text-[#24352c] transition hover:border-[#24352c]"
                  >
                    Order via WhatsApp
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
              if (!result.success) {
                throw new Error(result.error || 'Products could not be refreshed.');
              }
              setProducts(result.data);
            })
            .catch((error: unknown) => {
              setProductError(
                error instanceof Error ? error.message : 'Products could not be refreshed.',
              );
            });
        }}
        onCloseCheckout={() => setCheckoutItems(null)}
      />
    </div>
  );
}

function FacebookIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-[14px] w-[14px]" fill="currentColor">
      <path d="M13.5 21v-8.2h2.8l.4-3.2h-3.2V7.5c0-.9.3-1.6 1.6-1.6h1.7V3.1c-.3 0-1.3-.1-2.5-.1-2.5 0-4.2 1.5-4.2 4.3v2.3H7.3v3.2h2.8V21h3.4Z" />
    </svg>
  );
}

function InstagramIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-[14px] w-[14px]"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <rect x="3.5" y="3.5" width="17" height="17" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.7" cy="6.7" r="0.8" fill="currentColor" stroke="none" />
    </svg>
  );
}

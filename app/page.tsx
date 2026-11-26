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

function deduplicateProducts(list: Product[]): Product[] {
  const seenIds = new Set<string>();
  const seenKeys = new Set<string>();
  const result: Product[] = [];

  for (const item of list) {
    if (!item || !item._id) continue;
    const idKey = String(item._id).trim();
    const contentKey = `${String(item.name || '').trim().toLowerCase()}::${String(item.price)}::${String(item.image || '').trim()}`;
    if (seenIds.has(idKey) || seenKeys.has(contentKey)) continue;
    seenIds.add(idKey);
    seenKeys.add(contentKey);
    result.push(item);
  }

  return result;
}

export default function Home() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<Record<string, number>>({});
  const [cartHydrated, setCartHydrated] = useState(false);
  const [search, setSearch] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
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
  const searchAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (searchAreaRef.current && !searchAreaRef.current.contains(event.target as Node)) {
        setSearchFocused(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  useEffect(() => {
    let active = true;

    fetch('/api/products')
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok || !result.success) {
          throw new Error(result.error || 'Products could not be loaded.');
        }
        if (active) {
          const cleanProducts = deduplicateProducts(Array.isArray(result.data) ? result.data : []);
          setProducts(cleanProducts);
          try {
            const savedCart = window.localStorage.getItem('ittadi-cart');
            if (savedCart) {
              const parsedCart: unknown = JSON.parse(savedCart);
              if (parsedCart && typeof parsedCart === 'object' && !Array.isArray(parsedCart)) {
                const productsById = new Map(
                  cleanProducts.map((product) => [product._id, product]),
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
          const cleanProducts = deduplicateProducts(Array.isArray(result.data) ? result.data : []);
          setProducts(cleanProducts);
          const productsById = new Map(cleanProducts.map((product) => [product._id, product]));
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

  const displayProducts = useMemo(
    () => deduplicateProducts(products.length > 0 ? products : sampleProducts),
    [products],
  );

  const normalizedSearch = search.trim().toLowerCase();

  const searchDropdownMatches = useMemo(() => {
    if (!normalizedSearch) return [];
    return displayProducts
      .filter((product) =>
        `${product.name} ${product.category} ${product.description || ''}`
          .toLowerCase()
          .includes(normalizedSearch),
      )
      .slice(0, 6);
  }, [displayProducts, normalizedSearch]);

  const visibleProducts = useMemo(() => {
    return displayProducts.filter((product) => {
      const matchesCategory = category === 'All' || product.category === category;
      const matchesSearch =
        !normalizedSearch ||
        `${product.name} ${product.category} ${product.description || ''}`
          .toLowerCase()
          .includes(normalizedSearch);
      return matchesCategory && matchesSearch;
    });
  }, [category, displayProducts, normalizedSearch]);

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
    setSearchFocused(false);
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

  const showSearchDropdown = searchFocused && normalizedSearch.length > 0;

  return (
    <div className="storefront-shell min-h-screen w-full overflow-x-hidden bg-[var(--bg-page)] text-[var(--text-primary)] selection:bg-[#c9b07a] selection:text-[#14241c]">
      {/* Top Concierge Bar */}
      <div className="announcement-bar flex w-full flex-wrap items-center justify-between gap-2 border-b border-[#c9b07a]/15 px-4 py-2 text-[10px] font-medium uppercase tracking-[0.2em] text-[#f3efe6] sm:px-8 lg:px-14">
        <a
          className="truncate transition hover:text-[#e5d2ac]"
          href="https://wa.me/880153410524?text=Assalamu%20alaikum%2C%20I%20would%20like%20to%20place%20an%20order."
          target="_blank"
          rel="noreferrer"
        >
          Concierge &amp; WhatsApp · +880 1534-10524
        </a>
        <div className="flex items-center gap-2.5">
          <span className="hidden text-[#d9c7a6]/85 sm:inline">Nationwide Dispatch</span>
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
      <header className="glass-nav sticky top-0 z-30 border-b backdrop-blur-xl backdrop-saturate-150">
        <div
          ref={searchAreaRef}
          className="flex w-full flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-8 lg:flex-nowrap lg:px-14 lg:py-3.5"
        >
          {/* Brand Emblem + Wordmark */}
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
            className="group flex shrink-0 items-center gap-3 rounded-full py-0.5 text-left"
            title="Double-click or double-tap for admin"
            aria-label="Ittadi home. Double-click, double-tap, or press Enter for admin login."
          >
            <BrandMark />
            <div className="flex flex-col">
              <span className="brand-wordmark font-serif text-lg font-semibold tracking-[0.24em] sm:text-xl">
                ITTADI
              </span>
              <span className="text-[8px] font-semibold uppercase tracking-[0.3em] text-[#c9b07a]">
                Curated Living
              </span>
            </div>
          </button>

          {/* Desktop Navigation */}
          <nav
            aria-label="Main navigation"
            className="main-nav-links hidden items-center gap-7 text-[11px] font-semibold uppercase tracking-[0.18em] lg:flex"
          >
            <a href="#" className="underline decoration-[#c9b07a] underline-offset-8">
              Edition
            </a>
            <a href="#categories">Categories</a>
            <a href="#products">Collection</a>
            <a href="#about">Philosophy</a>
            <a href="#contact">Contact</a>
          </nav>

          {/* Utility Controls */}
          <div className="flex items-center gap-1.5 sm:gap-2.5">
            <div className="relative hidden lg:block lg:w-64">
              <label className="glass-control flex items-center gap-2 rounded-full px-4 py-2 text-[var(--text-muted)] transition">
                <Search size={15} aria-hidden="true" className="shrink-0 text-[#c9b07a]" />
                <input
                  type="search"
                  value={search}
                  onFocus={() => setSearchFocused(true)}
                  onChange={(event) => {
                    setSearch(event.target.value);
                    setSearchFocused(true);
                  }}
                  placeholder="Search objects..."
                  aria-label="Search products"
                  className="min-w-0 flex-1 bg-transparent text-xs outline-none placeholder:text-[var(--text-muted)]"
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch('')}
                    aria-label="Clear search"
                    className="rounded-full p-0.5 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                  >
                    <X size={13} />
                  </button>
                )}
              </label>

              {showSearchDropdown && (
                <div
                  role="listbox"
                  aria-label="Search results"
                  className="glass-panel absolute left-0 right-0 top-[calc(100%+0.5rem)] z-50 max-h-96 overflow-y-auto rounded-2xl p-2 shadow-2xl"
                >
                  {searchDropdownMatches.length === 0 ? (
                    <p className="px-3 py-4 text-center text-xs text-[var(--text-secondary)]">
                      No items found for &ldquo;{search.trim()}&rdquo;.
                    </p>
                  ) : (
                    <>
                      <div className="flex items-center justify-between px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--text-muted)]">
                        <span>Matching items</span>
                        <button
                          type="button"
                          onClick={() => {
                            setSearchFocused(false);
                            document.getElementById('products')?.scrollIntoView({ behavior: 'smooth' });
                          }}
                          className="text-[#8c6e3b] hover:underline dark:text-[#e5d2ac]"
                        >
                          See all ({visibleProducts.length})
                        </button>
                      </div>
                      <div className="space-y-1">
                        {searchDropdownMatches.map((item) => (
                          <button
                            key={item._id}
                            type="button"
                            onClick={() => openProduct(item)}
                            className="flex w-full items-center gap-3 rounded-xl p-2 text-left transition hover:bg-[var(--bg-surface-soft)]"
                          >
                            <img
                              src={item.image}
                              alt={item.name}
                              className="h-11 w-11 shrink-0 rounded-lg object-cover"
                            />
                            <div className="min-w-0 flex-1">
                              <p className="truncate font-serif text-xs font-medium">{item.name}</p>
                              <p className="text-[10px] text-[var(--text-muted)]">{item.category}</p>
                            </div>
                            <span className="shrink-0 text-xs font-bold text-[#8c6e3b] dark:text-[#e5d2ac]">
                              ৳ {item.price}
                            </span>
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>

            <Link
              href="/account"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Open customer account"
              className="glass-control flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-full px-2.5 text-xs transition sm:h-10 sm:px-4"
            >
              <CircleUserRound size={16} className="text-[#c9b07a]" />
              <span className="hidden text-[11px] font-semibold uppercase tracking-[0.14em] sm:inline">
                Account
              </span>
            </Link>

            <ThemeToggle />

            <button
              type="button"
              onClick={() => setCartOpen(true)}
              className="relative flex h-9 items-center justify-center gap-1.5 rounded-full border border-[#c9b07a]/35 bg-[#16261e] px-3.5 text-[#fbf8f1] shadow-sm transition hover:border-[#c9b07a] hover:bg-[#21382c] sm:h-10 sm:px-4"
              aria-label={`Open shopping bag, ${cartCount} items`}
            >
              <ShoppingBag size={15} className="text-[#e5d2ac]" />
              <span className="text-[10px] font-bold uppercase tracking-[0.14em]">
                Bag{cartCount > 0 ? ` (${cartCount})` : ''}
              </span>
            </button>
          </div>

          {/* Mobile Search Bar + Instant Dropdown */}
          <div className="relative w-full pt-1 lg:hidden">
            <label className="glass-control flex w-full items-center gap-2.5 rounded-xl px-3.5 py-2 text-[var(--text-muted)] transition">
              <Search size={15} aria-hidden="true" className="shrink-0 text-[#c9b07a]" />
              <input
                type="search"
                value={search}
                onFocus={() => setSearchFocused(true)}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setSearchFocused(true);
                }}
                placeholder="Search aesthetic lights, planters, decor..."
                aria-label="Search products"
                className="min-w-0 flex-1 bg-transparent text-xs outline-none placeholder:text-[var(--text-muted)]"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  aria-label="Clear search"
                  className="rounded-full p-0.5 text-[var(--text-muted)]"
                >
                  <X size={14} />
                </button>
              )}
            </label>

            {showSearchDropdown && (
              <div
                role="listbox"
                aria-label="Search results"
                className="glass-panel absolute left-0 right-0 top-[calc(100%+0.35rem)] z-50 max-h-80 overflow-y-auto rounded-2xl p-2 shadow-2xl"
              >
                {searchDropdownMatches.length === 0 ? (
                  <p className="px-3 py-4 text-center text-xs text-[var(--text-secondary)]">
                    No items found for &ldquo;{search.trim()}&rdquo;.
                  </p>
                ) : (
                  <>
                    <div className="flex items-center justify-between px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--text-muted)]">
                      <span>Search results</span>
                      <button
                        type="button"
                        onClick={() => {
                          setSearchFocused(false);
                          document.getElementById('products')?.scrollIntoView({ behavior: 'smooth' });
                        }}
                        className="text-[#8c6e3b] hover:underline dark:text-[#e5d2ac]"
                      >
                        View all ({visibleProducts.length})
                      </button>
                    </div>
                    <div className="space-y-1">
                      {searchDropdownMatches.map((item) => (
                        <button
                          key={item._id}
                          type="button"
                          onClick={() => openProduct(item)}
                          className="flex w-full items-center gap-3 rounded-xl p-2 text-left transition hover:bg-[var(--bg-surface-soft)]"
                        >
                          <img
                            src={item.image}
                            alt={item.name}
                            className="h-11 w-11 shrink-0 rounded-lg object-cover"
                          />
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-serif text-xs font-medium">{item.name}</p>
                            <p className="text-[10px] text-[var(--text-muted)]">{item.category}</p>
                          </div>
                          <span className="shrink-0 text-xs font-bold text-[#8c6e3b] dark:text-[#e5d2ac]">
                            ৳ {item.price}
                          </span>
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      <main>
        {/* Hero Section */}
        <section className="hero-stage relative isolate overflow-hidden border-b border-[#c9b07a]/20 text-[#fbf8f1]">
          <div className="hero-glow hero-glow-a" />
          <div className="hero-glow hero-glow-b" />
          <div className="hero-grid-pattern" />

          <div className="relative z-10 grid w-full items-center gap-8 px-4 py-6 sm:gap-12 sm:px-10 sm:py-14 lg:min-h-[640px] lg:grid-cols-[1.12fr_0.88fr] lg:gap-16 lg:px-14 lg:py-20">
            {/* Mobile Compact Editorial Banner */}
            <div className="relative overflow-hidden rounded-3xl border border-[#c9b07a]/25 bg-[#122019]/90 text-white shadow-[0_24px_55px_-20px_rgba(0,0,0,0.5)] lg:hidden">
              <div className="grid grid-cols-[1.15fr_0.85fr] items-center">
                <div className="p-5 sm:p-7">
                  <span className="inline-block rounded-full border border-[#c9b07a]/35 bg-[#c9b07a]/10 px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.2em] text-[#e5d2ac]">
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
                      className="inline-flex items-center gap-1.5 rounded-full bg-[#d9c7a6] px-4 py-2 text-[10px] font-bold uppercase tracking-[0.14em] text-[#122019] transition hover:bg-white"
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

                <div className="relative h-full min-h-[196px] overflow-hidden bg-[#1a2c23] sm:min-h-[240px]">
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
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#122019]/60 via-transparent to-transparent" />
                </div>
              </div>
            </div>

            {/* Desktop Editorial Typography */}
            <div className="hidden max-w-2xl lg:block">
              <div className="hero-eyebrow inline-flex items-center gap-2.5 rounded-full border px-4 py-1.5 text-[10px] font-bold uppercase tracking-[0.26em]">
                <Sparkles size={13} className="text-[#d9c7a6]" />
                <span>Curated Objects for Quiet Spaces</span>
              </div>

              <h1 className="hero-title mt-7 font-serif text-6xl font-normal leading-[1.04] tracking-tight xl:text-[4.6rem]">
                Timeless objects,
                <span className="mt-1.5 block italic text-[#e5d2ac]">crafted for living.</span>
              </h1>

              <p className="hero-copy mt-6 max-w-lg text-base leading-7">
                An edited selection of warm ambient lighting, sculptural decor, and everyday tactile pieces chosen to bring calm character into your home.
              </p>

              <div className="mt-9 flex flex-row items-center gap-3.5">
                <a
                  href="#products"
                  className="hero-primary-cta inline-flex items-center justify-center gap-2.5 rounded-full px-8 py-3.5 text-xs font-bold uppercase tracking-[0.18em] transition hover:bg-[#efe3cb]"
                >
                  <span>View the Edition</span>
                  <ArrowRight size={15} />
                </a>
                <a
                  href="https://wa.me/880153410524?text=Assalamu%20alaikum%2C%20I%20would%20like%20to%20place%20an%20order."
                  target="_blank"
                  rel="noreferrer"
                  className="hero-secondary-cta inline-flex items-center justify-center gap-2 rounded-full border border-[#d9c7a6]/35 bg-white/5 px-7 py-3.5 text-xs font-semibold uppercase tracking-[0.16em] text-[#fbf8f1] backdrop-blur-sm transition hover:bg-white/12"
                >
                  <Phone size={14} />
                  <span>Order via WhatsApp</span>
                </a>
              </div>

              <div className="mt-11 flex flex-wrap items-center gap-x-8 gap-y-3 border-t border-white/15 pt-6 text-[11px] uppercase tracking-[0.18em] text-[#d9c7a6]/85">
                <span>01 / Warm Lighting &amp; Decor</span>
                <span>02 / Thoughtful Gifting</span>
                <span>03 / Across Bangladesh</span>
              </div>
            </div>

            {/* Desktop Featured Showcase Card */}
            <div className="hero-showcase relative mx-auto hidden w-full max-w-[27rem] lg:block">
              <div className="rounded-[1.75rem] border border-[#d9c7a6]/30 bg-[#122019]/75 p-2.5 shadow-[0_30px_80px_-24px_rgba(0,0,0,0.65)]">
                <div className="relative aspect-[4/5] w-full overflow-hidden rounded-[1.3rem] bg-[#182720]">
                  {featuredLead?.image ? (
                    <img
                      src={featuredLead.image}
                      alt={featuredLead.name}
                      className="h-full w-full object-cover transition duration-700 hover:scale-[1.03]"
                    />
                  ) : (
                    <div className="flex h-full w-full flex-col items-center justify-center bg-[#182720] p-8 text-center">
                      <span className="text-[10px] font-bold uppercase tracking-[0.26em] text-[#d9c7a6]">
                        ITTADI ARCHIVE
                      </span>
                      <span className="mt-3 font-serif text-3xl italic text-[#fbf8f1]">
                        Quietly refined
                      </span>
                    </div>
                  )}

                  <div className="absolute inset-x-3 bottom-3 flex items-end justify-between gap-3 rounded-xl border border-[#d9c7a6]/25 bg-[#0d1612]/90 px-4 py-3 text-[#fbf8f1] backdrop-blur-md">
                    <div className="min-w-0">
                      <p className="text-[9px] font-bold uppercase tracking-[0.24em] text-[#d9c7a6]">
                        Featured Piece
                      </p>
                      <p className="mt-0.5 truncate font-serif text-base text-[#fbf8f1]">
                        {featuredLead?.name || 'Signature Home Objects'}
                      </p>
                      {featuredLead && (
                        <p className="mt-0.5 text-xs font-semibold text-[#e5d2ac]">
                          ৳ {featuredLead.price}
                        </p>
                      )}
                    </div>
                    {featuredLead && (
                      <button
                        type="button"
                        onClick={() => openProduct(featuredLead)}
                        aria-label={`Explore ${featuredLead.name}`}
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#d9c7a6] text-[#122019] transition hover:bg-white"
                      >
                        <ArrowUpRight size={16} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Category Showcase Grid */}
        <section id="categories" className="w-full border-b border-[var(--border-subtle)] px-4 py-8 sm:px-10 sm:py-12 lg:px-14">
          <div className="flex items-center justify-between gap-4">
            <div>
              <span className="section-eyebrow text-[10px] font-bold uppercase tracking-[0.24em] text-[var(--text-muted)]">
                Browse By Edit
              </span>
              <h2 className="mt-1 font-serif text-2xl font-normal sm:text-3xl">
                Featured Categories
              </h2>
            </div>
            {category !== 'All' && (
              <button
                type="button"
                onClick={() => setCategory('All')}
                className="rounded-full border border-[var(--border-strong)] px-3.5 py-1.5 text-[10px] font-bold uppercase tracking-[0.16em] transition hover:border-[#c9b07a]"
              >
                Reset ({category})
              </button>
            )}
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-5 lg:gap-5">
            {categoryCards.slice(0, 5).map((cat) => {
              const active = category === cat.name;
              return (
                <button
                  key={cat.name}
                  type="button"
                  onClick={() => setCategory(active ? 'All' : cat.name)}
                  aria-pressed={active}
                  className={`category-pill group flex flex-col items-center rounded-2xl border p-2.5 text-center transition sm:p-3.5 ${
                    active
                      ? 'border-[#16261e] bg-[#16261e] text-[#fbf8f1] shadow-md'
                      : 'border-[var(--border-subtle)] bg-[var(--bg-surface)] hover:border-[#c9b07a]'
                  }`}
                >
                  <div className="product-image-frame aspect-square w-full overflow-hidden rounded-xl">
                    <img
                      src={cat.image}
                      alt={cat.name}
                      loading="lazy"
                      className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                    />
                  </div>
                  <span className="mt-2.5 line-clamp-1 text-xs font-semibold tracking-tight">
                    {cat.name}
                  </span>
                  <span
                    className={`mt-0.5 text-[10px] ${
                      active ? 'text-[#e5d2ac]' : 'text-[var(--text-muted)]'
                    }`}
                  >
                    {cat.count} {cat.count === 1 ? 'item' : 'items'}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {/* Promise / Delivery Strip */}
        <section id="about" className="w-full border-b border-[var(--border-subtle)] px-4 py-6 sm:px-10 sm:py-9 lg:px-14">
          <div className="feature-strip grid w-full grid-cols-1 gap-4 p-4 sm:grid-cols-3 sm:gap-6 sm:p-6">
            <div className="flex items-start gap-3.5 rounded-2xl bg-[var(--bg-surface-soft)]/70 p-3.5 sm:p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#c9b07a]/35 bg-[#c9b07a]/12 text-[#8c6e3b] dark:text-[#e5d2ac]">
                <Truck size={18} strokeWidth={1.8} />
              </div>
              <div className="min-w-0">
                <h2 className="text-[11px] font-bold uppercase tracking-[0.16em]">
                  Nationwide Delivery
                </h2>
                <p className="mt-1 text-xs leading-5 text-[var(--text-secondary)]">
                  Carefully packed and dispatched across Bangladesh.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3.5 rounded-2xl bg-[var(--bg-surface-soft)]/70 p-3.5 sm:p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#c9b07a]/35 bg-[#c9b07a]/12 text-[#8c6e3b] dark:text-[#e5d2ac]">
                <ShieldCheck size={18} strokeWidth={1.8} />
              </div>
              <div className="min-w-0">
                <h2 className="text-[11px] font-bold uppercase tracking-[0.16em]">
                  Considered Selection
                </h2>
                <p className="mt-1 text-xs leading-5 text-[var(--text-secondary)]">
                  Checked for finish, warmth, and everyday utility.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3.5 rounded-2xl bg-[var(--bg-surface-soft)]/70 p-3.5 sm:p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#c9b07a]/35 bg-[#c9b07a]/12 text-[#8c6e3b] dark:text-[#e5d2ac]">
                <Headphones size={18} strokeWidth={1.8} />
              </div>
              <div className="min-w-0">
                <h2 className="text-[11px] font-bold uppercase tracking-[0.16em]">
                  Personal Support
                </h2>
                <p className="mt-1 text-xs leading-5 text-[var(--text-secondary)]">
                  Direct assistance for orders, gifting, and tracking.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Product Collection */}
        <section id="products" className="collection-section w-full px-4 py-10 sm:px-10 sm:py-20 lg:px-14">
          <div className="flex flex-col justify-between gap-4 border-b border-[var(--border-subtle)] pb-6 md:flex-row md:items-end">
            <div>
              <span className="section-eyebrow text-[10px] font-bold uppercase tracking-[0.26em] text-[var(--text-muted)]">
                The Catalog
              </span>
              <h2 className="mt-2 font-serif text-3xl font-normal sm:text-5xl">
                Curated Collection
              </h2>
            </div>
            <p className="max-w-md text-xs leading-6 text-[var(--text-secondary)] sm:text-sm">
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
                    ? 'border-[#16261e] bg-[#16261e] text-[#faf8f3]'
                    : 'border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:border-[#c9b07a]'
                }`}
              >
                {item}
              </button>
            ))}
          </div>

          {productError && (
            <p role="alert" className="mt-5 rounded-2xl border border-rose-300/60 bg-rose-500/10 px-4 py-3 text-xs text-rose-600 dark:text-rose-300 sm:text-sm">
              {productError} Sample products are shown below for preview only.
            </p>
          )}

          {!loading && products.length === 0 && !productError && (
            <p className="mt-5 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-4 py-3 text-xs text-[var(--text-secondary)] sm:text-sm">
              Preview listings are shown below. Publish the sample catalog from the admin panel to make them available for checkout.
            </p>
          )}

          {loading ? (
            <div className="mt-6 grid grid-cols-1 gap-3.5 sm:mt-10 sm:grid-cols-3 lg:grid-cols-4 lg:gap-6">
              {[1, 2, 3, 4].map((item) => (
                <div
                  key={item}
                  className="premium-card h-32 animate-pulse rounded-2xl bg-[var(--bg-surface-soft)] sm:aspect-[4/5] sm:h-auto"
                />
              ))}
            </div>
          ) : visibleProducts.length === 0 ? (
            <div className="mt-8 rounded-3xl border border-dashed border-[var(--border-strong)] bg-[var(--bg-surface)] px-6 py-14 text-center">
              <ShoppingBag className="mx-auto text-[var(--text-muted)]" size={26} />
              <p className="mt-3 font-serif text-2xl">
                {displayProducts.length === 0 ? 'Our shelves are getting ready.' : 'No matching objects found.'}
              </p>
              <p className="mt-1.5 text-xs text-[var(--text-secondary)] sm:text-sm">
                {displayProducts.length === 0
                  ? 'Please check back soon for our first collection.'
                  : 'Try clearing your search or switching categories.'}
              </p>
              {category !== 'All' && (
                <button
                  type="button"
                  onClick={() => setCategory('All')}
                  className="mt-4 text-xs font-semibold uppercase tracking-[0.16em] underline underline-offset-4"
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
                    className="premium-card product-card group flex min-w-0 flex-row items-center gap-3.5 p-2.5 sm:flex-col sm:items-stretch sm:justify-between sm:gap-0 sm:p-3.5"
                  >
                    <div>
                      <div className="product-image-frame relative h-24 w-24 shrink-0 overflow-hidden rounded-xl sm:aspect-[4/5] sm:h-auto sm:w-full">
                        {product.badge && (
                          <span className="product-badge hidden rounded-full bg-[var(--bg-surface)]/95 px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.18em] sm:absolute sm:left-2.5 sm:top-2.5 sm:z-10 sm:inline-block">
                            {product.badge}
                          </span>
                        )}
                        {discountPercent && (
                          <span className="hidden rounded-full bg-[#16261e] px-2 py-0.5 text-[9px] font-bold text-[#e5d2ac] sm:absolute sm:right-2.5 sm:top-2.5 sm:z-10 sm:inline-block">
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
                            className="h-full w-full object-cover"
                          />
                        </button>
                        {product.stock <= 0 && (
                          <div className="absolute inset-0 flex items-center justify-center bg-[#0e1813]/60 backdrop-blur-[1px]">
                            <span className="rounded-full bg-[#faf8f3] px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.16em] text-[#16261e] sm:px-4 sm:py-1.5 sm:text-[10px]">
                              Sold Out
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="product-card-info hidden sm:block sm:px-1 sm:pt-4">
                        <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-[var(--text-muted)]">
                          {product.category}
                        </p>
                        <h3 className="mt-1.5 line-clamp-2 min-h-10 font-serif text-lg font-medium leading-snug">
                          <button
                            type="button"
                            onClick={() => openProduct(product)}
                            className="text-left transition"
                          >
                            {product.name}
                          </button>
                        </h3>

                        <button
                          type="button"
                          onClick={() => openProduct(product)}
                          className="mt-1.5 inline-flex items-center gap-1 text-[10px] font-medium text-[var(--text-muted)] hover:underline"
                        >
                          {product.reviewCount ? (
                            <>
                              <Star size={11} className="fill-[#c9b07a] text-[#c9b07a]" />
                              {product.ratingAverage?.toFixed(1)} ({product.reviewCount})
                            </>
                          ) : (
                            <>View details</>
                          )}
                        </button>

                        <div className="mt-3 flex items-baseline gap-2">
                          <span className="text-base font-bold">
                            ৳ {product.price}
                          </span>
                          {product.oldPrice && product.oldPrice > product.price && (
                            <span className="text-xs text-[var(--text-muted)] line-through">
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
                          <p className="truncate text-[9px] font-bold uppercase tracking-[0.18em] text-[var(--text-muted)]">
                            {product.category}
                          </p>
                          {(discountPercent || product.badge) && (
                            <span className="shrink-0 rounded-full bg-[var(--bg-surface-soft)] px-2 py-0.5 text-[8px] font-bold uppercase tracking-[0.14em] text-[#8c6e3b] dark:text-[#e5d2ac]">
                              {discountPercent ? `-${discountPercent}%` : product.badge}
                            </span>
                          )}
                        </div>
                        <h3 className="mt-1 line-clamp-1 font-serif text-sm font-medium">
                          <button
                            type="button"
                            onClick={() => openProduct(product)}
                            className="text-left transition"
                          >
                            {product.name}
                          </button>
                        </h3>
                        <div className="mt-1 flex items-center justify-between gap-2">
                          <div className="flex items-baseline gap-1.5">
                            <span className="text-xs font-bold">
                              ৳ {product.price}
                            </span>
                            {product.oldPrice && product.oldPrice > product.price && (
                              <span className="text-[10px] text-[var(--text-muted)] line-through">
                                ৳ {product.oldPrice}
                              </span>
                            )}
                          </div>
                          {product.reviewCount ? (
                            <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-[var(--text-muted)]">
                              <Star size={10} className="fill-[#c9b07a] text-[#c9b07a]" />
                              {product.ratingAverage?.toFixed(1)}
                            </span>
                          ) : null}
                        </div>
                      </div>

                      <div className="mt-2.5">
                        {product.isSample ? (
                          <p className="rounded-full bg-[var(--bg-surface-soft)] px-2.5 py-1.5 text-center text-[9px] font-medium text-[var(--text-muted)]">
                            Preview · Publish from Admin
                          </p>
                        ) : (
                          <div className="flex gap-1.5">
                            <button
                              type="button"
                              disabled={product.stock <= 0}
                              onClick={() => updateCart(product._id, 1)}
                              className="flex min-w-0 flex-1 items-center justify-center gap-1 rounded-full border border-[var(--border-strong)] px-2 py-1.5 text-[9px] font-bold uppercase tracking-[0.1em] transition hover:border-[#c9b07a] disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              <Plus size={12} /> Bag
                            </button>
                            <button
                              type="button"
                              disabled={product.stock <= 0}
                              onClick={() => startCheckout([product], { [product._id]: 1 })}
                              className="flex min-w-0 flex-1 items-center justify-center rounded-full bg-[#16261e] px-2 py-1.5 text-[9px] font-bold uppercase tracking-[0.1em] text-[#faf8f3] transition hover:bg-[#243c30] disabled:cursor-not-allowed disabled:opacity-40"
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
                        <p className="rounded-full bg-[var(--bg-surface-soft)] px-3 py-2.5 text-center text-[10px] font-medium text-[var(--text-muted)]">
                          Preview · Publish from Admin
                        </p>
                      ) : (
                        <div className="flex gap-2">
                          <button
                            type="button"
                            disabled={product.stock <= 0}
                            onClick={() => updateCart(product._id, 1)}
                            className="flex min-w-0 flex-1 items-center justify-center gap-1 rounded-full border border-[var(--border-strong)] px-2.5 py-2.5 text-[10px] font-bold uppercase tracking-[0.12em] transition hover:border-[#c9b07a] disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            <Plus size={13} /> Bag
                          </button>
                          <button
                            type="button"
                            disabled={product.stock <= 0}
                            onClick={() => startCheckout([product], { [product._id]: 1 })}
                            className="flex min-w-0 flex-1 items-center justify-center rounded-full bg-[#16261e] px-2.5 py-2.5 text-[10px] font-bold uppercase tracking-[0.12em] text-[#faf8f3] transition hover:bg-[#243c30] disabled:cursor-not-allowed disabled:opacity-40"
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
      <footer id="contact" className="border-t border-[#c9b07a]/20 bg-[#0e1813] text-[#faf8f3]">
        <div className="grid w-full gap-8 px-5 py-12 sm:grid-cols-2 sm:gap-10 sm:px-10 lg:grid-cols-[1.35fr_0.75fr_1fr] lg:px-14 lg:py-16">
          <div>
            <div className="flex items-center gap-3">
              <BrandMark />
              <span className="font-serif text-xl tracking-[0.24em] text-white">ITTADI</span>
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
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 px-4 py-8 backdrop-blur-sm"
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
            className="glass-panel w-full max-w-sm rounded-3xl p-6 shadow-2xl sm:p-8"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[var(--text-muted)]">
                  Private workspace
                </p>
                <h2 className="mt-2 font-serif text-3xl">Admin sign in</h2>
              </div>
              <button
                type="button"
                onClick={() => setAdminLoginOpen(false)}
                disabled={adminLoginPending}
                aria-label="Close admin sign in"
                className="rounded-full p-2 text-[var(--text-muted)] transition hover:bg-[var(--bg-surface-soft)] disabled:opacity-40"
              >
                <X size={19} />
              </button>
            </div>
            <p className="mt-3 text-xs leading-6 text-[var(--text-secondary)] sm:text-sm">
              Enter your password to open the product studio.
            </p>
            {adminLoginError && (
              <p role="alert" className="mt-4 rounded-xl bg-rose-500/10 px-4 py-3 text-xs text-rose-600 dark:text-rose-300 sm:text-sm">
                {adminLoginError}
              </p>
            )}
            <form onSubmit={handleAdminLogin} className="mt-6">
              <label htmlFor="store-admin-password" className="text-xs font-semibold">
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
                className="mt-2 w-full rounded-xl border border-[var(--border-strong)] bg-[var(--bg-surface)] px-4 py-3 text-sm outline-none transition focus:border-[#c9b07a]"
                placeholder="Enter your password"
              />
              <button
                type="submit"
                disabled={adminLoginPending}
                className="mt-4 w-full rounded-full bg-[#16261e] px-5 py-3.5 text-xs font-bold uppercase tracking-[0.16em] text-[#faf8f3] transition hover:bg-[#243c30] disabled:cursor-wait disabled:opacity-60"
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
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <section
            aria-label="Shopping bag"
            aria-modal="true"
            role="dialog"
            className="glass-panel relative flex h-full w-full max-w-md flex-col border-l shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-[var(--border-subtle)] px-6 py-5">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[var(--text-muted)]">
                  Selected objects
                </p>
                <h2 className="mt-1 font-serif text-2xl">
                  Shopping bag ({cartCount})
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setCartOpen(false)}
                aria-label="Close shopping bag"
                className="rounded-full p-2 text-[var(--text-muted)] transition hover:bg-[var(--bg-surface-soft)]"
              >
                <X size={20} />
              </button>
            </div>

            {cartItems.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
                <ShoppingCart size={30} className="text-[var(--text-muted)]" />
                <p className="mt-4 font-serif text-2xl">Your bag is empty.</p>
                <p className="mt-2 text-xs leading-6 text-[var(--text-secondary)] sm:text-sm">
                  Explore the collection and add pieces you love.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setCartOpen(false);
                    document.getElementById('products')?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="mt-6 rounded-full bg-[#16261e] px-6 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-[#faf8f3] transition hover:bg-[#243c30]"
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
                      className="flex gap-4 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-3"
                    >
                      <img
                        src={product.image}
                        alt={product.name}
                        className="h-20 w-20 rounded-xl object-cover"
                      />
                      <div className="min-w-0 flex-1">
                        <h3 className="line-clamp-2 font-serif text-sm font-medium">
                          {product.name}
                        </h3>
                        <p className="mt-1 text-xs font-bold text-[#8c6e3b] dark:text-[#e5d2ac]">৳ {product.price}</p>
                        <div className="mt-2.5 flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => updateCart(product._id, -1)}
                            aria-label={`Remove one ${product.name}`}
                            className="rounded-full border border-[var(--border-strong)] p-1.5 transition hover:bg-[var(--bg-surface-soft)]"
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
                            className="rounded-full border border-[var(--border-strong)] p-1.5 transition hover:bg-[var(--bg-surface-soft)] disabled:opacity-40"
                          >
                            <Plus size={12} />
                          </button>
                        </div>
                      </div>
                      <span className="self-start text-xs font-bold sm:text-sm">
                        ৳ {product.price * cart[product._id]}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="border-t border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-[var(--text-secondary)]">Subtotal</span>
                    <span className="font-serif text-xl font-semibold">
                      ৳ {cartTotal}
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-[var(--text-muted)]">
                    Delivery charges are confirmed when placing your order.
                  </p>
                  <button
                    type="button"
                    onClick={() => startCheckout(cartItems, cart)}
                    className="mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-[#16261e] px-5 py-3.5 text-xs font-bold uppercase tracking-[0.16em] text-[#faf8f3] transition hover:bg-[#243c30]"
                  >
                    <Check size={16} /> Checkout &amp; track order
                  </button>
                  <a
                    href={orderLink(cartItems, cart)}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-3 flex w-full items-center justify-center gap-2 rounded-full border border-[var(--border-strong)] px-5 py-3 text-xs font-semibold transition hover:border-[#c9b07a]"
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
              setProducts(deduplicateProducts(Array.isArray(result.data) ? result.data : []));
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

function BrandMark() {
  return (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#c9b07a]/55 bg-[#122019] text-[#e5d2ac] shadow-[0_4px_14px_rgba(0,0,0,0.22)] transition-transform duration-300 group-hover:scale-105 sm:h-10 sm:w-10">
      <svg
        aria-hidden="true"
        viewBox="0 0 32 32"
        className="h-5 w-5"
        fill="none"
      >
        <circle cx="16" cy="16" r="12.5" stroke="currentColor" strokeWidth="1.2" opacity="0.45" />
        <path
          d="M16 7.5V24.5M12.2 10.5H19.8M12.2 21.5H19.8"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
        />
      </svg>
    </span>
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
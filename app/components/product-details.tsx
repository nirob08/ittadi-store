'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import Link from 'next/link';
import { ArrowLeft, ChevronLeft, ChevronRight, Minus, Plus, ShoppingBag, Star } from 'lucide-react';
import CustomerHub from '@/app/components/customer-hub';
import ThemeToggle from '@/app/components/theme-toggle';
import { sampleProducts } from '@/lib/sample-products';

type Product = {
  _id: string;
  name: string;
  category: string;
  price: number;
  oldPrice?: number;
  image: string;
  images: string[];
  videoUrl?: string;
  description?: string;
  specifications?: string;
  stock: number;
  isSample?: boolean;
  ratingAverage?: number;
  reviewCount?: number;
};

type Review = {
  _id: string;
  rating: number;
  comment: string;
  createdAt: string;
  customerName: string;
  verifiedPurchase: boolean;
};

type CheckoutItem = {
  productId: string;
  quantity: number;
  name: string;
  unitPrice: number;
  image: string;
};

function sampleProductForId(id: string): Product | null {
  const sampleIndex = /^sample-preview-(\d+)$/.exec(id);
  const sample = sampleIndex ? sampleProducts[Number(sampleIndex[1])] : null;
  return sample
    ? { ...sample, _id: id, images: [sample.image], stock: 10, isSample: true }
    : null;
}

export default function ProductDetails({ productId }: { productId: string }) {
  const [product, setProduct] = useState<Product | null>(() => sampleProductForId(productId));
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewSummary, setReviewSummary] = useState({ average: 0, count: 0 });
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewError, setReviewError] = useState('');
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [activeImage, setActiveImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(() => !sampleProductForId(productId));
  const [checkoutItems, setCheckoutItems] = useState<CheckoutItem[] | null>(null);
  const galleryRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    if (sampleProductForId(productId)) {
      return () => {
        active = false;
      };
    }

    Promise.all([
      fetch(`/api/products/${productId}`, { cache: 'no-store' }).then(async (response) => {
        const result = await response.json();
        if (!response.ok || !result.success) throw new Error(result.error || 'Product details could not be loaded.');
        return result.data as Product;
      }),
      fetch('/api/products', { cache: 'no-store' }).then(async (response) => {
        const result = await response.json();
        if (!response.ok || !result.success) throw new Error(result.error || 'Related products could not be loaded.');
        return result.data as Product[];
      }),
    ])
      .then(([loadedProduct, allProducts]) => {
        if (!active) return;
        const images = loadedProduct.images?.length ? loadedProduct.images : [loadedProduct.image];
        setProduct({ ...loadedProduct, images, videoUrl: loadedProduct.videoUrl || '' });
        setActiveImage(0);
        setQuantity(1);
        setReviewSummary({
          average: loadedProduct.ratingAverage || 0,
          count: loadedProduct.reviewCount || 0,
        });
        setRelatedProducts(allProducts.filter(
          (item) => item.category === loadedProduct.category && item._id !== loadedProduct._id,
        ));
      })
      .catch((loadError: unknown) => {
        if (active) setError(loadError instanceof Error ? loadError.message : 'Product details could not be loaded.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [productId]);

  useEffect(() => {
    if (!product || product.isSample) return undefined;
    let active = true;
    fetch(`/api/products/${product._id}/reviews`, { cache: 'no-store' })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Reviews could not be loaded.');
        if (active) {
          setReviews(result.reviews);
          setReviewSummary(result.summary);
        }
      })
      .catch((loadError: unknown) => {
        if (active) setReviewError(loadError instanceof Error ? loadError.message : 'Reviews could not be loaded.');
      });
    return () => {
      active = false;
    };
  }, [product]);

  const selectedProduct = product;
  const specificationLines = useMemo(
    () => (product?.specifications || '').split('\n').map((line) => line.trim()).filter(Boolean),
    [product?.specifications],
  );

  const changeQuantity = (change: number) => {
    if (!product) return;
    setQuantity((current) => Math.min(Math.max(1, current + change), Math.max(1, Math.min(product.stock, 20))));
  };

  const addToBag = () => {
    if (!product || product.isSample) return;
    try {
      const savedCart: unknown = JSON.parse(window.localStorage.getItem('ittadi-cart') || '{}');
      if (!savedCart || typeof savedCart !== 'object' || Array.isArray(savedCart)) {
        throw new Error('The saved shopping bag has an invalid format.');
      }
      const current = savedCart as Record<string, unknown>;
      const previous = Number.isInteger(current[product._id]) ? Number(current[product._id]) : 0;
      const next = Math.min(previous + quantity, product.stock, 20);
      if (next <= previous) {
        setNotice('Your bag already has the maximum available quantity.');
        return;
      }
      window.localStorage.setItem('ittadi-cart', JSON.stringify({ ...current, [product._id]: next }));
      setNotice('Added to your bag.');
    } catch (storageError) {
      console.error('The shopping bag could not be updated:', storageError);
      setError('Your bag could not be updated in this browser.');
    }
  };

  const submitReview = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!product || product.isSample) return;
    setReviewSubmitting(true);
    setReviewError('');
    try {
      const response = await fetch(`/api/products/${product._id}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating: reviewRating, comment: reviewComment }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Your review could not be submitted.');
      setReviews((current) => [result.review, ...current]);
      setReviewSummary(result.summary);
      setReviewComment('');
    } catch (submitError) {
      setReviewError(submitError instanceof Error ? submitError.message : 'Your review could not be submitted.');
    } finally {
      setReviewSubmitting(false);
    }
  };

  if (loading) {
    return <main className="flex min-h-screen items-center justify-center text-sm text-slate-500">Loading product…</main>;
  }

  if (!selectedProduct) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-5 text-center">
        <p role="alert" className="text-sm text-rose-700">{error || 'This product could not be found.'}</p>
        <Link href="/" className="rounded-full bg-[#24352c] px-5 py-3 text-sm font-semibold text-white">Return to the store</Link>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-[#faf9f6] text-slate-900">
      <header className="glass-nav sticky top-0 z-30 border-b border-[#e9e6df]">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-8">
          <Link href="/" className="flex items-center gap-2" aria-label="Ittadi home">
            <img src="/favicon.png" alt="" className="h-10 w-10 rounded-xl object-cover" />
            <span className="text-lg font-black tracking-[0.16em] text-[#24352c]">ITTADI</span>
          </Link>
          <div className="flex items-center gap-2">
            <Link href="/#products" className="rounded-full border border-[#e5e2dc] px-4 py-2 text-xs font-semibold text-[#315b45]">Shop</Link>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-7 sm:px-8 sm:py-12">
        <Link href="/#products" className="inline-flex items-center gap-2 text-xs font-semibold text-[#58745d] transition hover:-translate-x-1">
          <ArrowLeft size={15} /> Back to collection
        </Link>

        <div className="mt-6 grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:gap-14">
          <section aria-label="Product media" className="min-w-0">
            <div
              ref={galleryRef}
              onScroll={(event) => {
                const slideWidth = event.currentTarget.clientWidth;
                if (slideWidth > 0) setActiveImage(Math.round(event.currentTarget.scrollLeft / slideWidth));
              }}
              className="overflow-x-auto overscroll-x-contain rounded-3xl shadow-xl shadow-slate-900/5 snap-x snap-mandatory"
              style={{ scrollbarWidth: 'none' }}
            >
              <div className="flex">
                {selectedProduct.images.map((image, index) => (
                  <img
                    key={`${image}-${index}`}
                    src={image}
                    alt={`${selectedProduct.name} view ${index + 1}`}
                    className="aspect-square w-full shrink-0 snap-center bg-[#eeece6] object-cover"
                  />
                ))}
              </div>
            </div>
            {selectedProduct.images.length > 1 && (
              <>
                <div className="mt-3 flex gap-2 overflow-x-auto pb-2">
                  {selectedProduct.images.map((image, index) => (
                    <button
                      type="button"
                      key={`${image}-thumb-${index}`}
                      onClick={() => {
                        setActiveImage(index);
                        galleryRef.current?.scrollTo({ left: galleryRef.current.clientWidth * index, behavior: 'smooth' });
                      }}
                      aria-label={`Show product image ${index + 1}`}
                      aria-pressed={activeImage === index}
                      className={`h-16 w-16 shrink-0 overflow-hidden rounded-xl border-2 transition ${activeImage === index ? 'border-[#315b45]' : 'border-transparent opacity-70 hover:opacity-100'}`}
                    >
                      <img src={image} alt="" className="h-full w-full object-cover" />
                    </button>
                  ))}
                </div>
                <div className="mt-2 flex justify-end gap-2">
                  <button type="button" onClick={() => changeImage(-1)} aria-label="Previous image" className="rounded-full border border-[#e5e2dc] p-2 text-[#315b45]"><ChevronLeft size={17} /></button>
                  <button type="button" onClick={() => changeImage(1)} aria-label="Next image" className="rounded-full border border-[#e5e2dc] p-2 text-[#315b45]"><ChevronRight size={17} /></button>
                </div>
              </>
            )}
            {selectedProduct.videoUrl && (
              <div className="mt-5">
                <ProductVideo url={selectedProduct.videoUrl} title={`${selectedProduct.name} product video`} />
              </div>
            )}
          </section>

          <section className="glass-panel h-fit rounded-3xl p-5 sm:p-8">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#829078]">{selectedProduct.category}</p>
            <h1 className="mt-2 font-serif text-3xl text-[#24352c] sm:text-4xl">{selectedProduct.name}</h1>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <span className="text-2xl font-bold text-[#315b45]">৳ {selectedProduct.price}</span>
              {selectedProduct.oldPrice && selectedProduct.oldPrice > selectedProduct.price && <span className="text-sm text-slate-400 line-through">৳ {selectedProduct.oldPrice}</span>}
              <span className="text-xs text-slate-500">{selectedProduct.isSample ? 'Preview listing' : selectedProduct.stock > 0 ? `${selectedProduct.stock} in stock` : 'Sold out'}</span>
            </div>
            <div className="mt-4 flex items-center gap-2 text-xs text-slate-600">
              <span className="flex" aria-label={`${reviewSummary.average.toFixed(1)} out of 5 stars`}>
                {[1, 2, 3, 4, 5].map((star) => <Star key={star} size={15} className={star <= Math.round(reviewSummary.average) ? 'fill-[#d49a54] text-[#d49a54]' : 'text-slate-300'} />)}
              </span>
              {reviewSummary.count ? `${reviewSummary.average.toFixed(1)} · ${reviewSummary.count} customer reviews` : 'No reviews yet'}
            </div>
            {selectedProduct.description && <p className="mt-6 whitespace-pre-wrap text-sm leading-7 text-slate-600">{selectedProduct.description}</p>}

            {specificationLines.length > 0 && (
              <section className="mt-6 border-t border-[#e9e6df] pt-5">
                <h2 className="font-serif text-xl text-[#24352c]">Specifications</h2>
                <ul className="mt-3 space-y-2 text-sm text-slate-600">
                  {specificationLines.map((line, index) => <li key={`${line}-${index}`} className="rounded-xl bg-white/70 px-3 py-2">{line}</li>)}
                </ul>
              </section>
            )}

            {selectedProduct.isSample ? (
              <p className="mt-6 rounded-xl bg-[#f0eee8] p-4 text-xs leading-5 text-slate-600">This is a preview listing, not yet linked to live stock. Publish it from the Admin panel before accepting orders.</p>
            ) : (
              <>
                <div className="mt-7 flex flex-wrap items-center gap-3">
                  <div className="flex items-center rounded-full border border-[#e5e2dc]">
                    <button type="button" onClick={() => changeQuantity(-1)} aria-label="Decrease quantity" className="p-3 text-[#315b45]"><Minus size={14} /></button>
                    <span className="min-w-8 text-center text-sm font-semibold">{quantity}</span>
                    <button type="button" onClick={() => changeQuantity(1)} aria-label="Increase quantity" disabled={quantity >= Math.min(selectedProduct.stock, 20)} className="p-3 text-[#315b45] disabled:opacity-40"><Plus size={14} /></button>
                  </div>
                  <button type="button" disabled={selectedProduct.stock <= 0} onClick={addToBag} className="inline-flex flex-1 items-center justify-center gap-2 rounded-full border border-[#d9d5cc] px-4 py-3 text-xs font-bold text-[#315b45] transition hover:border-[#315b45] disabled:opacity-40">
                    <ShoppingBag size={15} /> Add to bag
                  </button>
                  <button type="button" disabled={selectedProduct.stock <= 0} onClick={() => setCheckoutItems([{
                    productId: selectedProduct._id,
                    quantity,
                    name: selectedProduct.name,
                    unitPrice: selectedProduct.price,
                    image: selectedProduct.image,
                  }])} className="flex-1 rounded-full bg-[#24352c] px-4 py-3 text-xs font-bold text-white transition hover:bg-[#315b45] disabled:opacity-40">
                    Buy now
                  </button>
                </div>
                {notice && <p role="status" className="mt-3 text-xs font-semibold text-[#315b45]">{notice}</p>}
              </>
            )}
            {error && <p role="alert" className="mt-3 text-xs text-rose-700">{error}</p>}
          </section>
        </div>

        <section className="mt-12 border-t border-[#e9e6df] pt-8">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#829078]">Real customer experiences</p>
              <h2 className="mt-1 font-serif text-2xl text-[#24352c]">Ratings &amp; reviews</h2>
            </div>
            <p className="text-xs text-slate-500">{reviewSummary.count} verified review(s)</p>
          </div>
          {reviewError && <p role="alert" className="mt-4 rounded-xl bg-rose-50 px-4 py-3 text-xs text-rose-700">{reviewError}</p>}
          {!selectedProduct.isSample && (
            <form onSubmit={submitReview} className="glass-panel mt-5 rounded-2xl p-4 sm:p-5">
              <label className="text-xs font-semibold text-[#47564b]">Your rating</label>
              <div className="mt-2 flex gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button key={star} type="button" aria-label={`Rate ${star} star${star === 1 ? '' : 's'}`} aria-pressed={reviewRating === star} onClick={() => setReviewRating(star)} className="rounded p-1">
                    <Star size={19} className={star <= reviewRating ? 'fill-[#d49a54] text-[#d49a54]' : 'text-slate-300'} />
                  </button>
                ))}
              </div>
              <textarea required minLength={3} maxLength={1000} value={reviewComment} onChange={(event) => setReviewComment(event.target.value)} rows={3} className="mt-3 w-full resize-y rounded-xl border border-[#e5e2dc] bg-[#faf9f6] px-3 py-2.5 text-xs outline-none focus:border-[#58745d]" placeholder="Share your experience (after delivery)" />
              <div className="mt-3 flex items-center gap-3">
                <button type="submit" disabled={reviewSubmitting} className="rounded-full bg-[#24352c] px-4 py-2.5 text-xs font-bold text-white disabled:opacity-50">{reviewSubmitting ? 'Submitting…' : 'Submit verified review'}</button>
                <Link href="/account" className="text-[10px] font-semibold text-[#58745d] underline">Sign in</Link>
              </div>
            </form>
          )}
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {reviews.length === 0 && !reviewError && <p className="rounded-xl bg-white p-4 text-xs text-slate-500">Be the first to share feedback after your order is delivered.</p>}
            {reviews.map((review) => (
              <article key={review._id} className="glass-panel rounded-2xl p-4">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-xs font-bold text-[#24352c]">{review.customerName}</p>
                  <span className="flex shrink-0" aria-label={`${review.rating} out of 5 stars`}>
                    {[1, 2, 3, 4, 5].map((star) => <Star key={star} size={12} className={star <= review.rating ? 'fill-[#d49a54] text-[#d49a54]' : 'text-slate-300'} />)}
                  </span>
                </div>
                <p className="mt-2 whitespace-pre-wrap text-xs leading-5 text-slate-600">{review.comment}</p>
                <p className="mt-2 text-[9px] text-[#58745d]">Verified purchase · {new Date(review.createdAt).toLocaleDateString()}</p>
              </article>
            ))}
          </div>
        </section>

        {relatedProducts.length > 0 && (
          <section className="mt-14 border-t border-[#e9e6df] pt-8">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#829078]">Selected for you</p>
            <h2 className="mt-1 font-serif text-2xl text-[#24352c]">You may also like</h2>
            <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {relatedProducts.slice(0, 4).map((related) => (
                <Link key={related._id} href={`/product/${related._id}`} className="premium-card overflow-hidden">
                  <img src={related.image} alt={related.name} className="aspect-square w-full object-cover transition duration-500 hover:scale-[1.03]" />
                  <div className="p-3">
                    <p className="line-clamp-2 text-xs font-semibold text-[#24352c]">{related.name}</p>
                    <p className="mt-2 text-xs font-bold text-[#315b45]">৳ {related.price}</p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </main>

      {checkoutItems && (
        <CustomerHub
          checkoutItems={checkoutItems}
          onCheckoutComplete={() => setCheckoutItems(null)}
          onCloseCheckout={() => setCheckoutItems(null)}
        />
      )}
    </div>
  );

  function changeImage(change: number) {
    if (!product) return;
    const next = (activeImage + change + product.images.length) % product.images.length;
    setActiveImage(next);
    galleryRef.current?.scrollTo({ left: galleryRef.current.clientWidth * next, behavior: 'smooth' });
  }
}

function ProductVideo({ url, title }: { url: string; title: string }) {
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    return null;
  }
  const youtubeId = parsedUrl.hostname === 'youtu.be'
    ? parsedUrl.pathname.slice(1)
    : parsedUrl.hostname.endsWith('youtube.com')
      ? parsedUrl.searchParams.get('v') || parsedUrl.pathname.match(/\/(?:shorts|embed)\/([^/]+)/)?.[1]
      : '';
  const vimeoId = parsedUrl.hostname === 'vimeo.com'
    ? parsedUrl.pathname.split('/').filter(Boolean).at(-1)
    : '';
  if (youtubeId) {
    return <iframe title={title} src={`https://www.youtube-nocookie.com/embed/${encodeURIComponent(youtubeId)}`} className="aspect-video w-full rounded-2xl bg-black" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen />;
  }
  if (vimeoId && /^\d+$/.test(vimeoId)) {
    return <iframe title={title} src={`https://player.vimeo.com/video/${vimeoId}`} className="aspect-video w-full rounded-2xl bg-black" allow="autoplay; fullscreen; picture-in-picture" allowFullScreen />;
  }
  if (/\.(mp4|webm|ogg|mov|m4v)$/i.test(parsedUrl.pathname)) {
    return <video title={title} src={url} controls preload="metadata" className="aspect-video w-full rounded-2xl bg-black" />;
  }
  return <a href={url} target="_blank" rel="noreferrer" className="inline-flex items-center rounded-full border border-[#d9d5cc] px-4 py-2 text-xs font-semibold text-[#315b45]">Open product video</a>;
}

'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { nextOrderStatuses } from '@/lib/order-workflow';
import ThemeToggle from '@/app/components/theme-toggle';
import { ArrowLeft, Check, ImagePlus, LogOut, MapPin, MessageCircle, PackagePlus, Pencil, RefreshCw, ShieldCheck, Trash2, Truck, Users, X } from 'lucide-react';

const initialForm = {
  name: '',
  category: 'Aesthetic Light',
  price: '',
  oldPrice: '',
  image: '',
  images: [],
  videoUrl: '',
  description: '',
  specifications: '',
  badge: '',
  stock: '10',
};

const categories = [
  'Aesthetic Light',
  'Artificial Flower',
  'Indoor Planters',
  'Gadget',
  'Wall Decor & Mirrors',
];
export default function AdminPanel() {
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [replyDrafts, setReplyDrafts] = useState({});
  const [formData, setFormData] = useState(initialForm);
  const [editingProductId, setEditingProductId] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [trackingEdits, setTrackingEdits] = useState({});
  const [savingTrackingId, setSavingTrackingId] = useState('');
  const [customerDetail, setCustomerDetail] = useState(null);
  const [customerDetailLoading, setCustomerDetailLoading] = useState(false);
  const [deletingCustomerId, setDeletingCustomerId] = useState('');
  const [publishingSamples, setPublishingSamples] = useState(false);
  const [sampleStock, setSampleStock] = useState('10');
  const [password, setPassword] = useState('');
  const [authenticated, setAuthenticated] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const fetchProducts = useCallback(async () => {
    try {
      const response = await fetch('/api/products');
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Products could not be loaded.');
      }
      setProducts(result.data);
      setError('');
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : 'Products could not be loaded.');
    }
  }, []);

  const fetchAdminData = useCallback(async () => {
    try {
      const [overviewResponse, supportResponse] = await Promise.all([
        fetch('/api/admin/overview'),
        fetch('/api/admin/support'),
      ]);
      const [overview, support] = await Promise.all([overviewResponse.json(), supportResponse.json()]);
      if (!overviewResponse.ok || !supportResponse.ok) {
        throw new Error(overview.error || support.error || 'Customer information could not be loaded.');
      }
      setCustomers(overview.customers);
      setOrders(overview.orders);
      setReviews(overview.reviews || []);
      setConversations(support.conversations);
      setError('');
    } catch (dataError) {
      setError(dataError instanceof Error ? dataError.message : 'Customer information could not be loaded.');
    }
  }, []);

  useEffect(() => {
    let active = true;
    fetch('/api/admin/session')
      .then((response) => response.json())
      .then((result) => {
        if (active) setAuthenticated(result.authenticated === true);
      })
      .catch(() => {
        if (active) setError('Could not verify the admin session. Please refresh the page.');
      })
      .finally(() => {
        if (active) setCheckingSession(false);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!authenticated) return undefined;
    let active = true;
    fetch('/api/products')
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok || !result.success) throw new Error(result.error || 'Products could not be loaded.');
        if (active) setProducts(result.data);
      })
      .catch((fetchError) => {
        if (active) setError(fetchError instanceof Error ? fetchError.message : 'Products could not be loaded.');
      });
    Promise.all([fetch('/api/admin/overview'), fetch('/api/admin/support')])
      .then(async ([overviewResponse, supportResponse]) => {
        const [overview, support] = await Promise.all([overviewResponse.json(), supportResponse.json()]);
        if (!overviewResponse.ok || !supportResponse.ok) {
          throw new Error(overview.error || support.error || 'Customer information could not be loaded.');
        }
        if (!active) return;
        setCustomers(overview.customers);
        setOrders(overview.orders);
        setReviews(overview.reviews || []);
        setConversations(support.conversations);
        setError('');
      })
      .catch((dataError) => {
        if (active) setError(dataError instanceof Error ? dataError.message : 'Customer information could not be loaded.');
      });
    return () => {
      active = false;
    };
  }, [authenticated, fetchAdminData]);

  useEffect(() => {
    if (!authenticated) return undefined;
    const timer = window.setInterval(() => {
      void fetchAdminData();
      void fetchProducts();
    }, 15000);
    return () => window.clearInterval(timer);
  }, [authenticated, fetchAdminData, fetchProducts]);

  const handleLogin = async (event) => {
    event.preventDefault();
    setError('');
    setMessage('');
    try {
      const response = await fetch('/api/admin/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const result = await response.json();
      if (!response.ok) {
        setError(
          response.status === 401
            ? 'Incorrect password. Please try again.'
            : result.error || `Login failed (HTTP ${response.status}).`,
        );
        return;
      }
      setPassword('');
      setAuthenticated(true);
    } catch {
      setError('Could not reach this site’s API. Open the same localhost port shown by npm run dev, then try again.');
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setMessage('');

    try {
      const response = await fetch('/api/products', {
        method: editingProductId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          image: formData.images[0] || formData.image,
          images: [...new Set([formData.image, ...formData.images].filter(Boolean))],
          ...(editingProductId ? { id: editingProductId } : {}),
        }),
      });
      const result = await response.json();
      if (response.status === 401) {
        setAuthenticated(false);
        setError('Your admin session expired. Please sign in again.');
        return;
      }
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Product could not be published.');
      }
      setFormData(initialForm);
      setEditingProductId('');
      if (editingProductId) {
        setMessage(`${result.data.name} was updated in your store.`);
        await fetchProducts();
        return;
      }
      const pushInfo = result.notification?.configured
        ? ` Browser alerts sent to ${result.notification.sent} subscribed device(s).`
        : ' An in-app new-product notice is available; browser alerts need VAPID setup.';
      setMessage(`${result.data.name} is now live in your store.${pushInfo}`);
      await fetchProducts();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Product could not be published.');
    } finally {
      setSaving(false);
    }
  };

  const uploadProductImages = async (event) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;
    setError('');
    setMessage('');
    if ((formData.images?.length || 0) + files.length > 8) {
      setError('A product can have up to 8 images. Remove an image before adding more.');
      event.target.value = '';
      return;
    }
    if (files.some((file) => !['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size < 1 || file.size > 4 * 1024 * 1024)) {
      setError('Choose JPEG, PNG or WebP product images smaller than 4 MB each.');
      event.target.value = '';
      return;
    }

    setUploadingImage(true);
    try {
      const uploadedImages = [];
      for (const file of files) {
        const uploadData = new FormData();
        uploadData.append('image', file);
        const response = await fetch('/api/admin/media', { method: 'POST', body: uploadData });
        const result = await response.json();
        if (response.status === 401) {
          setAuthenticated(false);
          setError('Your admin session expired. Please sign in again.');
          return;
        }
        if (!response.ok || !result.success || typeof result.image !== 'string') {
          throw new Error(result.error || 'Product image could not be uploaded.');
        }
        uploadedImages.push(result.image);
      }
      setFormData((current) => {
        const images = [...new Set([...(current.images || []), ...uploadedImages])];
        return { ...current, images, image: current.image || images[0] };
      });
      setMessage(`${uploadedImages.length} product image(s) uploaded. Save the product to publish the change.`);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : 'Product image could not be uploaded.');
    } finally {
      setUploadingImage(false);
      event.target.value = '';
    }
  };

  const publishSampleProducts = async () => {
    const stock = Number(sampleStock);
    if (!Number.isInteger(stock) || stock < 1 || stock > 10000) {
      setError('Choose a stock quantity from 1 to 10,000 for each preview product.');
      return;
    }
    const confirmed = window.confirm(
      `This creates six live, orderable listings with the shown sample prices and ${stock} unit(s) per product. Verify you can fulfill these products at these prices and stock levels before continuing.`,
    );
    if (!confirmed) return;

    setPublishingSamples(true);
    setError('');
    setMessage('');
    try {
      const response = await fetch('/api/admin/products/seed-samples', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stock }),
      });
      const result = await response.json();
      if (response.status === 401) {
        setAuthenticated(false);
        setError('Your admin session expired. Please sign in again.');
        return;
      }
      if (!response.ok || !result.success) throw new Error(result.error || 'Preview products could not be published.');
      await fetchProducts();
      setMessage(`${result.count} sample products are now live and orderable. Review each price and stock level before sharing the store.`);
    } catch (seedError) {
      setError(seedError instanceof Error ? seedError.message : 'Preview products could not be published.');
    } finally {
      setPublishingSamples(false);
    }
  };

  const editProduct = (product) => {
    setEditingProductId(product._id);
    setFormData({
      name: product.name,
      category: product.category,
      price: String(product.price),
      oldPrice: product.oldPrice == null ? '' : String(product.oldPrice),
      image: product.image,
      images: product.images?.length ? product.images : [product.image],
      videoUrl: product.videoUrl || product.video || '',
      description: product.description || '',
      specifications: product.specifications || '',
      badge: product.badge || '',
      stock: String(product.stock ?? 10),
    });
    document.getElementById('product-form')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const cancelProductEdit = () => {
    setEditingProductId('');
    setFormData(initialForm);
  };

  const removeProductImage = (image) => {
    const images = formData.images.filter((item) => item !== image);
    setFormData((current) => ({ ...current, images, image: images[0] || '' }));
  };

  const deleteProduct = async (product) => {
    if (!window.confirm(`Delete "${product.name}" from the store?`)) return;
    setError('');
    setMessage('');
    try {
      const response = await fetch('/api/products', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: product._id }),
      });
      const result = await response.json();
      if (response.status === 401) {
        setAuthenticated(false);
        setError('Your admin session expired. Please sign in again.');
        return;
      }
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Product could not be deleted.');
      }
      setMessage(`${product.name} was removed from your store.`);
      setProducts((current) => current.filter((item) => item._id !== product._id));
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Product could not be deleted.');
    }
  };

  const logout = async () => {
    try {
      const response = await fetch('/api/admin/session', { method: 'DELETE' });
      if (!response.ok) throw new Error('Could not end the admin session.');
      setAuthenticated(false);
      setProducts([]);
      setReviews([]);
      setMessage('');
      setError('');
    } catch (logoutError) {
      setError(logoutError instanceof Error ? logoutError.message : 'Could not log out.');
    }
  };

  const updateOrderStatus = async (orderId, status) => {
    setError('');
    setMessage('');
    try {
      const response = await fetch('/api/admin/orders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, status }),
      });
      const result = await response.json();
      if (response.status === 401) {
        setAuthenticated(false);
        setError('Your admin session expired. Please sign in again.');
        return;
      }
      if (!response.ok || !result.success) throw new Error(result.error || 'Order status could not be updated.');
      setOrders((current) => current.map((order) => order._id === orderId ? result.order : order));
      setMessage(`Order ${result.order.orderNumber} updated to ${status}.`);
    } catch (statusError) {
      setError(statusError instanceof Error ? statusError.message : 'Order status could not be updated.');
    }
  };

  const verifyOrderPayment = async (orderId) => {
    setError('');
    setMessage('');
    try {
      const response = await fetch('/api/admin/orders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, action: 'verify-payment' }),
      });
      const result = await response.json();
      if (response.status === 401) {
        setAuthenticated(false);
        setError('Your admin session expired. Please sign in again.');
        return;
      }
      if (!response.ok || !result.success) throw new Error(result.error || 'Payment could not be verified.');
      setOrders((current) => current.map((order) => order._id === orderId ? result.order : order));
      setMessage(`Payment for ${result.order.orderNumber} marked as verified.`);
    } catch (verificationError) {
      setError(verificationError instanceof Error ? verificationError.message : 'Payment could not be verified.');
    }
  };

  const updateOrderTracking = async (orderId) => {
    const order = orders.find((item) => item._id === orderId);
    if (!order) return;
    const tracking = trackingEdits[orderId] || {};
    const currentLocation = tracking.currentLocation ?? order.currentLocation ?? '';
    const trackingNote = tracking.trackingNote ?? order.trackingNote ?? '';
    setSavingTrackingId(orderId);
    setError('');
    setMessage('');
    try {
      const response = await fetch('/api/admin/orders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, action: 'update-tracking', currentLocation, trackingNote }),
      });
      const result = await response.json();
      if (response.status === 401) {
        setAuthenticated(false);
        setError('Your admin session expired. Please sign in again.');
        return;
      }
      if (!response.ok || !result.success) throw new Error(result.error || 'Order tracking could not be updated.');
      setOrders((current) => current.map((item) => item._id === orderId ? result.order : item));
      setTrackingEdits((current) => ({ ...current, [orderId]: { currentLocation, trackingNote } }));
      setMessage(`Tracking details for ${result.order.orderNumber} were updated.`);
    } catch (trackingError) {
      setError(trackingError instanceof Error ? trackingError.message : 'Order tracking could not be updated.');
    } finally {
      setSavingTrackingId('');
    }
  };

  const viewCustomer = async (customer) => {
    setCustomerDetailLoading(true);
    setCustomerDetail(null);
    setError('');
    try {
      const response = await fetch(`/api/admin/customers/${customer._id}`);
      const result = await response.json();
      if (response.status === 401) {
        setAuthenticated(false);
        throw new Error('Your admin session expired. Please sign in again.');
      }
      if (!response.ok) throw new Error(result.error || 'Customer profile could not be loaded.');
      setCustomerDetail(result);
    } catch (detailError) {
      setError(detailError instanceof Error ? detailError.message : 'Customer profile could not be loaded.');
    } finally {
      setCustomerDetailLoading(false);
    }
  };

  const deleteCustomer = async (customer) => {
    if (!window.confirm(`Permanently delete the account for ${customer.name} (${customer.email})? Completed order records will be retained.`)) return;
    setDeletingCustomerId(customer._id);
    setError('');
    setMessage('');
    try {
      const response = await fetch(`/api/admin/customers/${customer._id}`, { method: 'DELETE' });
      const result = await response.json();
      if (response.status === 401) {
        setAuthenticated(false);
        setError('Your admin session expired. Please sign in again.');
        return;
      }
      if (!response.ok || !result.success) throw new Error(result.error || 'Customer account could not be deleted.');
      setCustomers((current) => current.filter((item) => item._id !== customer._id));
      setCustomerDetail((current) => current?.customer?._id === customer._id ? null : current);
      setMessage(`${customer.name}'s account was deleted. Completed order records were retained.`);
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Customer account could not be deleted.');
    } finally {
      setDeletingCustomerId('');
    }
  };

  const sendAdminReply = async (customerId) => {
    const text = (replyDrafts[customerId] || '').trim();
    if (!text) return;
    setError('');
    try {
      const response = await fetch('/api/admin/support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerId, text }),
      });
      const result = await response.json();
      if (response.status === 401) {
        setAuthenticated(false);
        setError('Your admin session expired. Please sign in again.');
        return;
      }
      if (!response.ok || !result.success) throw new Error(result.error || 'Reply could not be sent.');
      setConversations((current) => {
        const existing = current.find((conversation) => conversation.customer._id === customerId);
        if (existing) {
          return current.map((conversation) => conversation.customer._id === customerId
            ? { ...conversation, messages: [...conversation.messages, result.message] }
            : conversation);
        }
        const customer = customers.find((item) => item._id === customerId);
        if (!customer) return current;
        return [{ customer, messages: [result.message] }, ...current];
      });
      setReplyDrafts((current) => ({ ...current, [customerId]: '' }));
      setMessage('Your reply was sent to the customer.');
    } catch (replyError) {
      setError(replyError instanceof Error ? replyError.message : 'Reply could not be sent.');
    }
  };

  const fieldClass = 'mt-2 w-full rounded-xl border border-[#e5e2dc] bg-white px-4 py-3 text-sm text-[#24352c] outline-none transition placeholder:text-slate-400 focus:border-[#58745d] focus:ring-4 focus:ring-[#58745d]/10';
  const productCategories = [...new Set([...categories, ...products.map((product) => product.category), formData.category].filter(Boolean))];

  if (checkingSession) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f7f6f2]">
        <div className="flex items-center gap-3 text-sm font-medium text-[#58745d]">
          <RefreshCw size={17} className="animate-spin" /> Checking admin session
        </div>
      </main>
    );
  }

  if (!authenticated) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f7f6f2] px-4 py-12">
        <section className="glass-panel backdrop-blur-2xl backdrop-saturate-150 w-full max-w-md rounded-3xl p-7 shadow-xl shadow-[#24352c]/5 sm:p-9">
          <Link href="/" className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 transition hover:text-[#315b45]">
            <ArrowLeft size={15} /> Back to store
          </Link>
          <div className="mt-8 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#eaf0e8] text-[#315b45]">
            <ShieldCheck size={23} />
          </div>
          <p className="mt-6 text-[10px] font-bold uppercase tracking-[0.22em] text-[#829078]">Private workspace</p>
          <h1 className="mt-2 font-serif text-4xl text-[#24352c]">Welcome back.</h1>
          <p className="mt-3 text-sm leading-6 text-slate-500">Sign in to manage your Ittadi product collection.</p>
          {error && <p role="alert" className="mt-5 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}
          <form onSubmit={handleLogin} className="mt-7 space-y-4">
            <label htmlFor="admin-password" className="block text-xs font-semibold text-[#47564b]">Admin password</label>
            <input
              id="admin-password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              required
              autoFocus
              className={fieldClass}
              placeholder="Enter your password"
            />
            <button type="submit" className="w-full rounded-xl bg-[#24352c] px-5 py-3.5 text-sm font-bold text-white transition hover:bg-[#315b45]">
              Sign in to admin
            </button>
          </form>
          <p className="mt-5 text-center text-[11px] leading-5 text-slate-400">Your admin session is private and expires automatically.</p>
        </section>
      </main>
    );
  }

  return (
    <div className="admin-shell min-h-screen bg-[#f7f6f2] text-[#24352c]">
      <header className="glass-nav backdrop-blur-xl backdrop-saturate-150 sticky top-0 z-30 border-b border-[#e9e6df]">
        <div className="flex w-full items-center justify-between gap-4 px-4 py-4 sm:px-8 lg:px-12">
          <div className="flex items-center gap-3">
            <img src="/favicon.png" alt="" className="h-10 w-10 rounded-xl object-cover" />
            <div>
              <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#829078]">Ittadi Store</p>
              <h1 className="font-serif text-xl sm:text-2xl">Product studio</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link href="/" className="inline-flex items-center gap-2 rounded-full border border-[#e5e2dc] px-3 py-2 text-xs font-semibold text-slate-600 transition hover:border-[#829078] hover:text-[#24352c] sm:px-4 sm:text-sm">
              <ArrowLeft size={15} /> <span className="hidden sm:inline">Live store</span><span className="sm:hidden">Store</span>
            </Link>
            <button type="button" onClick={logout} className="inline-flex items-center gap-2 rounded-full bg-[#24352c] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#315b45] sm:px-4 sm:text-sm">
              <LogOut size={15} /> <span className="hidden sm:inline">Sign out</span>
            </button>
          </div>
        </div>
      </header>

      <main className="admin-main w-full space-y-7 px-4 py-8 sm:px-8 sm:py-10 lg:px-12">
        <section className="admin-hero rounded-3xl px-6 py-7 text-white sm:px-9 sm:py-9">
          <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#d9c7a6]">Your little corner of the internet</p>
              <h2 className="mt-2 font-serif text-3xl sm:text-4xl">Make the collection yours.</h2>
              <p className="mt-2 text-sm text-white/65">Add products, update your shelves, and keep the shop looking lovely.</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/10 px-5 py-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-white/60">Live products</p>
              <p className="mt-1 text-3xl font-semibold">{products.length}</p>
            </div>
          </div>
        </section>

        {error && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}
        {message && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{message}</p>}

        <section id="product-form" className="glass-panel backdrop-blur-2xl backdrop-saturate-150 rounded-3xl p-5 sm:p-8">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#eaf0e8] text-[#315b45]"><PackagePlus size={19} /></div>
            <div>
              <h2 className="text-lg font-bold">{editingProductId ? 'Edit product' : 'Add a product'}</h2>
              <p className="mt-0.5 text-xs text-slate-500">{editingProductId ? 'Update the product information and live stock.' : 'It will appear in your live store as soon as it is published.'}</p>
            </div>
          </div>
          <form onSubmit={handleSubmit} className="grid gap-x-5 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
            <label className="text-xs font-semibold text-[#47564b]">
              Product name
              <input required maxLength={120} value={formData.name} onChange={(event) => setFormData({ ...formData, name: event.target.value })} className={fieldClass} placeholder="Tulip Night Lamp" />
            </label>
            <label className="text-xs font-semibold text-[#47564b]">
              Category
              <select value={formData.category} onChange={(event) => setFormData({ ...formData, category: event.target.value })} className={fieldClass}>
                {productCategories.map((category) => <option key={category} value={category}>{category}</option>)}
              </select>
            </label>
            <label className="text-xs font-semibold text-[#47564b]">
              Selling price (৳)
              <input type="number" min="1" step="0.01" required value={formData.price} onChange={(event) => setFormData({ ...formData, price: event.target.value })} className={fieldClass} placeholder="599" />
            </label>
            <label className="text-xs font-semibold text-[#47564b]">
              Previous price (optional)
              <input type="number" min="0" step="0.01" value={formData.oldPrice} onChange={(event) => setFormData({ ...formData, oldPrice: event.target.value })} className={fieldClass} placeholder="899" />
            </label>
            <label className="text-xs font-semibold text-[#47564b]">
              Main product image URL
              <input type="text" inputMode="url" required value={formData.image} onChange={(event) => {
                const image = event.target.value;
                setFormData((current) => ({
                  ...current,
                  image,
                  images: image
                    ? [image, ...(current.images || []).filter((item) => item !== current.image)]
                    : (current.images || []).slice(1),
                }));
              }} className={fieldClass} placeholder="https://example.com/product.jpg or /api/media/…" />
            </label>
            <label className="text-xs font-semibold text-[#47564b]">
              Upload product images
              <input type="file" accept="image/jpeg,image/png,image/webp" multiple disabled={uploadingImage} onChange={uploadProductImages} className={`${fieldClass} file:mr-3 file:rounded-full file:border-0 file:bg-[#eaf0e8] file:px-3 file:py-2 file:text-xs file:font-semibold file:text-[#315b45]`} />
              <span className="mt-1 block text-[10px] font-normal text-slate-500">{uploadingImage ? 'Uploading images…' : 'Up to 8 JPEG, PNG or WebP images · maximum 4 MB each · stored in MongoDB GridFS'}</span>
            </label>
            <label className="text-xs font-semibold text-[#47564b]">
              Stock quantity
              <input type="number" min="0" step="1" required value={formData.stock} onChange={(event) => setFormData({ ...formData, stock: event.target.value })} className={fieldClass} placeholder="10" />
            </label>
            <label className="text-xs font-semibold text-[#47564b] sm:col-span-2">
              Product badge (optional)
              <input maxLength={40} value={formData.badge} onChange={(event) => setFormData({ ...formData, badge: event.target.value })} className={fieldClass} placeholder="New arrival / Best seller" />
            </label>
            <label className="text-xs font-semibold text-[#47564b]">
              Product video link (optional)
              <input type="url" inputMode="url" value={formData.videoUrl} onChange={(event) => setFormData({ ...formData, videoUrl: event.target.value })} className={fieldClass} placeholder="YouTube, Vimeo or HTTPS video URL" />
            </label>
            <label className="text-xs font-semibold text-[#47564b] sm:col-span-2 lg:col-span-3">
              Product information (optional)
              <textarea maxLength={2000} rows={4} value={formData.description} onChange={(event) => setFormData({ ...formData, description: event.target.value })} className={fieldClass} placeholder="Describe the product accurately: materials, dimensions, care, what's included…" />
            </label>
            <label className="text-xs font-semibold text-[#47564b] sm:col-span-2 lg:col-span-3">
              Specifications (optional · one detail per line)
              <textarea maxLength={4000} rows={3} value={formData.specifications} onChange={(event) => setFormData({ ...formData, specifications: event.target.value })} className={fieldClass} placeholder={'Material: Ceramic\nDimensions: 12 × 8 cm\nCare: Wipe with a dry cloth'} />
            </label>
            {formData.images.length > 0 && (
              <div className="flex flex-wrap gap-3 rounded-xl border border-[#e9e6df] bg-[#faf9f6] p-3 sm:col-span-2 lg:col-span-3">
                {formData.images.map((image, index) => (
                  <div key={`${image}-${index}`} className="relative">
                    <img src={image} alt={`Product preview ${index + 1}`} className="h-16 w-16 rounded-lg object-cover" />
                    <span className="absolute bottom-1 left-1 rounded bg-black/60 px-1.5 py-0.5 text-[8px] font-bold text-white">{index === 0 ? 'Cover' : index + 1}</span>
                    <button type="button" onClick={() => removeProductImage(image)} aria-label={`Remove product image ${index + 1}`} className="absolute -right-2 -top-2 rounded-full bg-white p-1 text-rose-600 shadow"><X size={12} /></button>
                  </div>
                ))}
                <span className="self-center text-xs text-slate-500"><ImagePlus size={16} className="mr-1 inline" />{formData.images.length} image(s)</span>
              </div>
            )}
            <div className="sm:col-span-2 lg:col-span-3">
              <button disabled={saving || uploadingImage} type="submit" className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#24352c] px-5 py-3.5 text-sm font-bold text-white transition hover:bg-[#315b45] disabled:cursor-wait disabled:opacity-60 sm:w-auto">
                {saving ? <RefreshCw size={16} className="animate-spin" /> : editingProductId ? <Check size={16} /> : <PackagePlus size={16} />}
                {saving ? (editingProductId ? 'Saving changes…' : 'Publishing product…') : editingProductId ? 'Save changes' : 'Publish product'}
              </button>
              {editingProductId && <button type="button" disabled={saving} onClick={cancelProductEdit} className="ml-2 inline-flex items-center gap-2 rounded-xl border border-[#e5e2dc] px-5 py-3.5 text-sm font-semibold text-slate-600 transition hover:bg-[#faf9f6] disabled:opacity-50"><X size={15} /> Cancel edit</button>}
            </div>
          </form>
        </section>

        {products.length === 0 && (
          <section className="glass-panel backdrop-blur-2xl backdrop-saturate-150 rounded-3xl p-5 sm:p-8">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#829078]">Ready-to-publish preview catalog</p>
            <h2 className="mt-2 font-serif text-2xl text-[#24352c]">Make the six sample listings orderable</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">This creates six database-backed products using the sample prices shown in the storefront. Confirm that prices, image rights and stock match what you can actually fulfill before publishing; the listings will immediately accept orders.</p>
            <div className="mt-4 flex flex-wrap items-end gap-3">
              <label className="text-xs font-semibold text-[#47564b]">Available units per sample product
                <input type="number" min="1" max="10000" step="1" value={sampleStock} onChange={(event) => setSampleStock(event.target.value)} className={fieldClass} />
              </label>
              <button type="button" disabled={publishingSamples} onClick={() => void publishSampleProducts()} className="inline-flex items-center gap-2 rounded-xl bg-[#315b45] px-5 py-3 text-sm font-bold text-white hover:bg-[#24352c] disabled:opacity-50">
                {publishingSamples ? <RefreshCw size={15} className="animate-spin" /> : <PackagePlus size={15} />}
                {publishingSamples ? 'Publishing…' : 'Publish sample listings'}
              </button>
            </div>
          </section>
        )}

        <section className="glass-panel backdrop-blur-2xl backdrop-saturate-150 overflow-hidden rounded-3xl">
          <div className="flex items-center justify-between border-b border-[#efede8] px-5 py-5 sm:px-7">
            <div>
              <h2 className="text-lg font-bold">Verified customer reviews</h2>
              <p className="mt-1 text-xs text-slate-500">{reviews.length} recent review(s) · refreshed with customer and order data</p>
            </div>
            <button type="button" onClick={() => void fetchAdminData()} className="rounded-full border border-[#e5e2dc] px-4 py-2 text-xs font-semibold text-slate-600 hover:border-[#829078]">Refresh</button>
          </div>
          <div className="divide-y divide-[#efede8]">
            {reviews.length === 0 ? (
              <p className="px-5 py-10 text-center text-sm text-slate-500">Verified product reviews will appear here after customers submit them.</p>
            ) : reviews.map((review) => (
              <article key={review._id} className="flex flex-col gap-2 px-5 py-4 sm:flex-row sm:items-start sm:justify-between sm:px-7">
                <div>
                  <p className="text-sm font-bold text-[#24352c]">{review.productId?.name || 'Product removed'} · {review.rating}/5 stars</p>
                  <p className="mt-1 text-xs text-slate-600">{review.comment}</p>
                  <p className="mt-2 text-[10px] text-slate-500">{review.customerId?.name || 'Customer'} · {review.customerId?.email || 'No email'} · Verified delivered order</p>
                </div>
                <time className="shrink-0 text-[10px] text-slate-400">{new Date(review.createdAt).toLocaleString()}</time>
              </article>
            ))}
          </div>
        </section>

        <section className="glass-panel backdrop-blur-2xl backdrop-saturate-150 overflow-hidden rounded-3xl">
          <div className="flex flex-col justify-between gap-3 border-b border-[#efede8] px-5 py-5 sm:flex-row sm:items-center sm:px-7">
            <div>
              <h2 className="text-lg font-bold">Your products</h2>
              <p className="mt-1 text-xs text-slate-500">The latest additions appear first.</p>
            </div>
            <button type="button" onClick={() => void fetchProducts()} className="inline-flex items-center gap-2 self-start rounded-full border border-[#e5e2dc] px-4 py-2 text-xs font-semibold text-slate-600 transition hover:border-[#829078] hover:text-[#24352c] sm:self-auto">
              <RefreshCw size={14} /> Refresh list
            </button>
          </div>
          <div aria-label="Product list. Newest products appear first." tabIndex={0} className="max-h-[70vh] overflow-auto overscroll-contain focus:outline-none focus-visible:ring-2 focus-visible:ring-[#58745d]">
            <table className="w-full min-w-[690px] text-left text-sm">
              <thead className="sticky top-0 z-10 bg-[#faf9f6] text-[10px] font-bold uppercase tracking-[0.13em] text-slate-500 shadow-sm">
                <tr>
                  <th className="px-5 py-3 sm:px-7">Product</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Price</th>
                  <th className="px-4 py-3">Stock</th>
                  <th className="px-5 py-3 text-right sm:px-7">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#efede8]">
                {products.length === 0 ? (
                  <tr><td colSpan="5" className="px-5 py-14 text-center text-sm text-slate-500">No products yet. Add your first product above.</td></tr>
                ) : products.map((product) => (
                  <tr key={product._id} className="transition hover:bg-[#faf9f6]">
                    <td className="px-5 py-4 sm:px-7">
                      <div className="flex items-center gap-3">
                        <img src={product.image} alt="" className="h-12 w-12 rounded-xl bg-[#eeece6] object-cover" />
                        <div className="min-w-0">
                          <p className="max-w-[230px] truncate font-semibold text-[#24352c]">{product.name}</p>
                          {product.badge && <p className="mt-1 text-[10px] font-medium text-[#829078]">{product.badge}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-xs text-slate-500">{product.category}</td>
                    <td className="px-4 py-4 font-semibold text-[#315b45]">৳ {product.price}</td>
                    <td className="px-4 py-4 text-slate-600">{product.stock ?? 10}</td>
                    <td className="px-5 py-4 text-right sm:px-7">
                      <div className="flex justify-end gap-2">
                        <button type="button" onClick={() => editProduct(product)} aria-label={`Edit ${product.name}`} className="inline-flex items-center gap-1.5 rounded-full border border-[#e5e2dc] px-3 py-2 text-xs font-semibold text-[#315b45] transition hover:bg-[#eaf0e8]">
                          <Pencil size={14} /><span className="hidden sm:inline">Edit</span>
                        </button>
                        <button type="button" onClick={() => void deleteProduct(product)} aria-label={`Delete ${product.name}`} className="inline-flex items-center gap-1.5 rounded-full border border-rose-100 px-3 py-2 text-xs font-semibold text-rose-600 transition hover:bg-rose-50">
                          <Trash2 size={14} /><span className="hidden sm:inline">Delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="glass-panel backdrop-blur-2xl backdrop-saturate-150 overflow-hidden rounded-3xl">
          <div className="flex items-center justify-between border-b border-[#efede8] px-5 py-5 sm:px-7">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#eaf0e8] text-[#315b45]"><Truck size={18} /></div>
              <div><h2 className="text-lg font-bold">Customer orders</h2><p className="mt-1 text-xs text-slate-500">{orders.length} recent order(s) · update delivery status here</p></div>
            </div>
            <button type="button" onClick={() => void fetchAdminData()} className="rounded-full border border-[#e5e2dc] px-4 py-2 text-xs font-semibold text-slate-600 hover:border-[#829078]">Refresh</button>
          </div>
          <div aria-label="Customer orders. Newest orders appear first." tabIndex={0} className="max-h-[70vh] overflow-auto overscroll-contain focus:outline-none focus-visible:ring-2 focus-visible:ring-[#58745d]">
            <table className="w-full min-w-[980px] text-left text-sm">
              <thead className="sticky top-0 z-10 bg-[#faf9f6] text-[10px] font-bold uppercase tracking-[0.13em] text-slate-500 shadow-sm">
                <tr><th className="px-5 py-3">Order / Customer</th><th className="px-4 py-3">Delivery address</th><th className="px-4 py-3">Items / bill</th><th className="px-4 py-3">Status</th></tr>
              </thead>
              <tbody className="divide-y divide-[#efede8]">
                {orders.length === 0 ? (
                  <tr><td colSpan="4" className="px-5 py-12 text-center text-sm text-slate-500">Customer orders will appear here.</td></tr>
                ) : orders.map((order) => {
                  const buyer = customers.find((customer) => customer._id === String(order.customerId));
                  return (
                    <tr key={order._id} className="align-top hover:bg-[#faf9f6]">
                      <td className="px-5 py-4">
                        <p className="font-bold text-[#24352c]">{order.orderNumber}</p>
                        <p className="mt-1 text-xs font-semibold">{buyer?.name || order.deliveryAddress?.name || 'Customer'}</p>
                        <p className="mt-1 text-[10px] text-slate-500">{buyer?.email || ''}</p>
                        <p className="text-[10px] text-slate-500">{order.deliveryAddress?.phone || buyer?.phone || ''}</p>
                        <p className="mt-1 text-[10px] text-slate-400">{new Date(order.createdAt).toLocaleString()}</p>
                      </td>
                      <td className="max-w-[260px] px-4 py-4 text-xs leading-5 text-slate-600">
                        {order.deliveryAddress?.street}, {order.deliveryAddress?.area}, {order.deliveryAddress?.district}
                        {order.deliveryAddress?.location && (
                          <a className="mt-1 block font-semibold text-[#58745d] underline" href={`https://maps.google.com/?q=${order.deliveryAddress.location.latitude},${order.deliveryAddress.location.longitude}`} target="_blank" rel="noreferrer">Open delivery location</a>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <ul className="space-y-1 text-xs text-slate-600">{order.items.map((item, index) => <li key={`${item.productId}-${index}`}>{item.name} × {item.quantity}</li>)}</ul>
                        <div className="mt-2 space-y-1 text-[10px]">
                          <p className="flex justify-between gap-3 text-slate-500"><span>Subtotal</span><span>৳ {order.subtotal ?? order.total}</span></p>
                          <p className="flex justify-between gap-3 text-slate-500"><span>Delivery</span><span>৳ {order.deliveryFee ?? 0}</span></p>
                          <p className="flex justify-between gap-3 text-slate-500"><span>Payment</span><span>{order.paymentMethod || 'Cash on delivery'} · {order.paymentStatus === 'paid' ? 'Paid' : order.paymentStatus === 'review' ? 'Needs review' : order.paymentStatus === 'failed' ? 'Failed' : order.paymentMethod === 'Cash on delivery' ? 'Pay on delivery' : 'Pending'}</span></p>
                          {order.paymentReference && <p className="flex justify-between gap-3 text-slate-500"><span>TxnID</span><span className="max-w-[150px] break-all text-right">{order.paymentReference}</span></p>}
                          <p className="flex justify-between gap-3 border-t border-[#efede8] pt-1 font-bold text-[#315b45]"><span>Total</span><span>৳ {order.total}</span></p>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        {(() => {
                          const isCod = !order.paymentMethod || order.paymentMethod === 'Cash on delivery';
                          const canCancel = isCod || order.paymentStatus !== 'paid';
                          const allowedStatuses = (nextOrderStatuses[order.status] || []).filter((status) => (
                            status === 'Cancelled'
                              ? canCancel
                              : isCod || order.paymentStatus === 'paid'
                          ));
                          const canVerifyPayment = order.status !== 'Cancelled' && ['pending', 'review'].includes(order.paymentStatus) && (
                            order.paymentMethod === 'Manual bKash' ||
                            order.paymentMethod === 'Manual Nagad' ||
                            (order.paymentMethod === 'SSLCOMMERZ' && order.paymentStatus === 'review')
                          );
                          return (
                            <div className="space-y-2">
                              <label className="block text-[10px] font-semibold text-slate-500">
                                Parcel location
                                <input
                                  maxLength={160}
                                  value={trackingEdits[order._id]?.currentLocation ?? order.currentLocation ?? ''}
                                  onChange={(event) => setTrackingEdits((current) => ({
                                    ...current,
                                    [order._id]: {
                                      ...current[order._id],
                                      currentLocation: event.target.value,
                                    },
                                  }))}
                                  className="mt-1 w-full rounded-lg border border-[#e5e2dc] bg-white px-2.5 py-2 text-[10px]"
                                  placeholder="e.g. Dhaka sorting hub"
                                />
                              </label>
                              <label className="block text-[10px] font-semibold text-slate-500">
                                Tracking update
                                <textarea
                                  maxLength={500}
                                  value={trackingEdits[order._id]?.trackingNote ?? order.trackingNote ?? ''}
                                  onChange={(event) => setTrackingEdits((current) => ({
                                    ...current,
                                    [order._id]: {
                                      ...current[order._id],
                                      trackingNote: event.target.value,
                                    },
                                  }))}
                                  rows={2}
                                  className="mt-1 w-full rounded-lg border border-[#e5e2dc] bg-white px-2.5 py-2 text-[10px]"
                                  placeholder="Add a short delivery update"
                                />
                              </label>
                              <button type="button" disabled={savingTrackingId === order._id} onClick={() => void updateOrderTracking(order._id)} className="w-full rounded-lg border border-[#e5e2dc] px-3 py-2 text-[10px] font-bold text-[#315b45] hover:bg-[#eaf0e8] disabled:opacity-50">
                                {savingTrackingId === order._id ? 'Saving tracking…' : 'Save tracking'}
                              </button>
                              <select aria-label={`Update status for ${order.orderNumber}`} value={order.status} disabled={!allowedStatuses.length} onChange={(event) => void updateOrderStatus(order._id, event.target.value)} className="rounded-xl border border-[#e5e2dc] bg-white px-3 py-2 text-xs font-semibold text-[#24352c] outline-none focus:border-[#58745d] disabled:bg-[#f5f3ed]">
                                {[order.status, ...allowedStatuses].map((status) => <option key={status} value={status}>{status}</option>)}
                              </select>
                              {canVerifyPayment && (
                                <>
                                  <p className="max-w-[180px] text-[10px] leading-4 text-slate-500">Check the wallet or gateway transaction before confirming.</p>
                                  <button type="button" onClick={() => void verifyOrderPayment(order._id)} className="block rounded-lg bg-[#315b45] px-3 py-2 text-[10px] font-bold text-white hover:bg-[#24352c]">Confirm payment</button>
                                </>
                              )}
                              {order.status !== 'Cancelled' && order.paymentStatus === 'pending' && ['Manual bKash', 'Manual Nagad'].includes(order.paymentMethod) && <p className="max-w-[180px] text-[10px] leading-4 text-amber-700">Check the transfer before cancelling; the customer may already have sent payment.</p>}
                              {order.status === 'Cancelled' && order.paymentStatus === 'review' && <p className="max-w-[180px] text-[10px] leading-4 text-amber-700">Check the gateway and arrange any required refund manually.</p>}
                            </div>
                          );
                        })()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        <section className="glass-panel backdrop-blur-2xl backdrop-saturate-150 overflow-hidden rounded-3xl">
          <div className="flex items-center gap-3 border-b border-[#efede8] px-5 py-5 sm:px-7">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#eaf0e8] text-[#315b45]"><Users size={18} /></div>
            <div><h2 className="text-lg font-bold">Customers</h2><p className="mt-1 text-xs text-slate-500">{customers.length} registered customer(s)</p></div>
          </div>
          <div aria-label="Customer directory. Newest customers appear first." tabIndex={0} className="max-h-[70vh] overflow-auto overscroll-contain focus:outline-none focus-visible:ring-2 focus-visible:ring-[#58745d]">
            <table className="w-full min-w-[850px] text-left text-sm">
              <thead className="sticky top-0 z-10 bg-[#faf9f6] text-[10px] font-bold uppercase tracking-[0.13em] text-slate-500 shadow-sm"><tr><th className="px-5 py-3 sm:px-7">Customer</th><th className="px-4 py-3">Contact</th><th className="px-4 py-3">Saved location</th><th className="px-4 py-3">Joined</th><th className="px-4 py-3">Orders</th><th className="px-5 py-3 text-right sm:px-7">Actions</th></tr></thead>
              <tbody className="divide-y divide-[#efede8]">
                {customers.length === 0 ? <tr><td colSpan="6" className="px-5 py-12 text-center text-sm text-slate-500">Registered customer details will appear here.</td></tr> : customers.map((customer) => (
                  <tr key={customer._id} className="hover:bg-[#faf9f6]">
                    <td className="px-5 py-4 sm:px-7"><button type="button" onClick={() => void viewCustomer(customer)} className="text-left font-semibold text-[#315b45] hover:underline">{customer.name}</button><p className="mt-1 text-xs text-slate-500">{customer.email}</p></td>
                    <td className="px-4 py-4 text-xs text-slate-600">{customer.phone || '—'}</td>
                    <td className="px-4 py-4 text-xs text-slate-600">
                      <p className="max-w-[250px]">{[customer.address?.street, customer.address?.area, customer.address?.district].filter(Boolean).join(', ') || 'No saved address'}</p>
                      {Number.isFinite(customer.location?.latitude) && Number.isFinite(customer.location?.longitude) && <a className="mt-1 inline-flex items-center gap-1 text-[10px] font-semibold text-[#58745d] underline" href={`https://maps.google.com/?q=${customer.location.latitude},${customer.location.longitude}`} target="_blank" rel="noreferrer"><MapPin size={11} /> Open map</a>}
                    </td>
                    <td className="px-4 py-4 text-xs text-slate-500">{new Date(customer.createdAt).toLocaleDateString()}</td>
                    <td className="px-4 py-4 text-xs font-semibold">{orders.filter((order) => String(order.customerId) === customer._id).length}</td>
                    <td className="px-5 py-4 text-right sm:px-7"><div className="flex justify-end gap-2"><button type="button" onClick={() => void viewCustomer(customer)} className="rounded-full border border-[#e5e2dc] px-3 py-2 text-[10px] font-semibold text-[#315b45] hover:bg-[#eaf0e8]">View</button><button type="button" disabled={deletingCustomerId === customer._id} onClick={() => void deleteCustomer(customer)} aria-label={`Delete ${customer.name}`} className="rounded-full border border-rose-100 px-3 py-2 text-[10px] font-semibold text-rose-600 hover:bg-rose-50 disabled:opacity-50">{deletingCustomerId === customer._id ? 'Deleting…' : 'Delete'}</button></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="glass-panel backdrop-blur-2xl backdrop-saturate-150 rounded-3xl p-5 sm:p-7">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#eaf0e8] text-[#315b45]"><MessageCircle size={18} /></div>
            <div><h2 className="text-lg font-bold">Customer support inbox</h2><p className="mt-1 text-xs text-slate-500">Reply directly to customer messages from here.</p></div>
          </div>
          <p className="px-5 pt-4 text-xs text-slate-500 sm:px-7">Newest customer conversations appear first. Scroll this list to view earlier conversations.</p>
          <div aria-label="Customer support conversations. Newest conversations appear first." tabIndex={0} className="mt-3 max-h-[70vh] overflow-y-auto overscroll-contain px-5 pb-5 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#58745d] sm:px-7 sm:pb-7">
            <div className="grid gap-4 xl:grid-cols-2">
            {conversations.length === 0 ? (
              <div className="rounded-2xl bg-[#faf9f6] px-5 py-10 text-center text-sm text-slate-500 xl:col-span-2">Customer conversations will appear here.</div>
            ) : conversations.map((conversation) => (
              <article key={conversation.customer._id} className="overflow-hidden rounded-2xl border border-[#e9e6df]">
                <div className="flex items-center justify-between gap-3 bg-[#faf9f6] px-4 py-3">
                  <div className="min-w-0"><p className="truncate text-sm font-bold">{conversation.customer.name}</p><p className="truncate text-[10px] text-slate-500">{conversation.customer.email} {conversation.customer.phone}</p></div>
                  <span className="shrink-0 rounded-full bg-[#eaf0e8] px-2.5 py-1 text-[10px] font-semibold text-[#315b45]">{conversation.messages.length} messages</span>
                </div>
                <div className="max-h-64 space-y-2 overflow-y-auto p-4">
                  {conversation.messages.map((item) => (
                    <div key={item._id} className={`flex ${item.sender === 'admin' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[85%] rounded-2xl px-3 py-2 ${item.sender === 'admin' ? 'bg-[#24352c] text-white' : 'bg-[#f1f0eb] text-[#24352c]'}`}>
                        <p className="whitespace-pre-wrap text-xs leading-5">{item.text}</p>
                        <time className={`mt-1 block text-[9px] ${item.sender === 'admin' ? 'text-white/50' : 'text-slate-400'}`}>{new Date(item.createdAt).toLocaleString()}</time>
                      </div>
                    </div>
                  ))}
                </div>
                <form onSubmit={(event) => { event.preventDefault(); void sendAdminReply(conversation.customer._id); }} className="flex gap-2 border-t border-[#efede8] p-3">
                  <input aria-label={`Reply to ${conversation.customer.name}`} maxLength={2000} value={replyDrafts[conversation.customer._id] || ''} onChange={(event) => setReplyDrafts({ ...replyDrafts, [conversation.customer._id]: event.target.value })} className="min-w-0 flex-1 rounded-xl border border-[#e5e2dc] px-3 py-2.5 text-xs outline-none focus:border-[#58745d]" placeholder="Write a reply…" />
                  <button type="submit" disabled={!(replyDrafts[conversation.customer._id] || '').trim()} className="inline-flex items-center gap-1.5 rounded-xl bg-[#24352c] px-3 py-2.5 text-xs font-bold text-white hover:bg-[#315b45] disabled:opacity-50"><Check size={14} /> Reply</button>
                </form>
              </article>
            ))}
            </div>
          </div>
        </section>

        {customerDetailLoading && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm" role="status">
            <div className="glass-panel backdrop-blur-2xl backdrop-saturate-150 rounded-2xl px-6 py-5 text-sm font-semibold">Loading customer profile…</div>
          </div>
        )}
        {customerDetail && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/55 p-3 backdrop-blur-sm sm:p-6" role="presentation" onMouseDown={(event) => {
            if (event.target === event.currentTarget) setCustomerDetail(null);
          }}>
            <section aria-label={`Customer profile for ${customerDetail.customer.name}`} aria-modal="true" role="dialog" className="glass-panel backdrop-blur-2xl backdrop-saturate-150 max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-3xl p-5 shadow-2xl sm:p-7">
              <div className="flex items-start justify-between gap-4">
                <div className="flex min-w-0 items-center gap-4">
                  {customerDetail.customer.avatarUrl
                    ? <img src={customerDetail.customer.avatarUrl} alt="" className="h-14 w-14 rounded-2xl object-cover" />
                    : <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#eaf0e8] font-bold text-[#315b45]">{customerDetail.customer.name.split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase()}</div>}
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#829078]">Customer profile</p>
                    <h2 className="mt-1 truncate font-serif text-2xl text-[#24352c]">{customerDetail.customer.name}</h2>
                  </div>
                </div>
                <button type="button" onClick={() => setCustomerDetail(null)} aria-label="Close customer profile" className="rounded-full p-2 text-slate-500 hover:bg-white/70"><X size={18} /></button>
              </div>
              <div className="mt-5 grid gap-3 rounded-2xl bg-white/60 p-4 text-xs sm:grid-cols-2">
                <p><span className="font-semibold text-slate-500">Email</span><br />{customerDetail.customer.email}</p>
                <p><span className="font-semibold text-slate-500">Phone</span><br />{customerDetail.customer.phone || 'Not provided'}</p>
                <p className="sm:col-span-2"><span className="font-semibold text-slate-500">Saved address</span><br />
                  {[
                    customerDetail.customer.address?.street,
                    customerDetail.customer.address?.area,
                    customerDetail.customer.address?.district,
                    customerDetail.customer.address?.postalCode,
                  ].filter(Boolean).join(', ') || 'No saved address'}
                </p>
                {Number.isFinite(customerDetail.customer.location?.latitude) && Number.isFinite(customerDetail.customer.location?.longitude) && (
                  <p className="sm:col-span-2">
                    <a className="inline-flex items-center gap-1 font-semibold text-[#58745d] underline" href={`https://maps.google.com/?q=${customerDetail.customer.location.latitude},${customerDetail.customer.location.longitude}`} target="_blank" rel="noreferrer">
                      <MapPin size={13} /> View saved customer location
                    </a>
                  </p>
                )}
              </div>
              <div className="mt-6 flex items-center justify-between gap-3">
                <h3 className="font-serif text-xl text-[#24352c]">Order history ({customerDetail.orders.length})</h3>
                <button type="button" disabled={deletingCustomerId === customerDetail.customer._id} onClick={() => void deleteCustomer(customerDetail.customer)} className="rounded-full border border-rose-100 px-3 py-2 text-[10px] font-semibold text-rose-600 hover:bg-rose-50 disabled:opacity-50">
                  {deletingCustomerId === customerDetail.customer._id ? 'Deleting…' : 'Delete customer'}
                </button>
              </div>
              <div className="mt-3 space-y-3">
                {customerDetail.orders.length === 0 ? <p className="rounded-xl bg-white/60 p-4 text-xs text-slate-500">This customer has no orders.</p> : customerDetail.orders.map((order) => (
                  <article key={order._id} className="rounded-2xl border border-[#e9e6df] bg-white/55 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div><p className="text-xs font-bold">{order.orderNumber}</p><time className="mt-1 block text-[10px] text-slate-500">{new Date(order.createdAt).toLocaleString()}</time></div>
                      <span className="rounded-full bg-[#eaf0e8] px-3 py-1.5 text-[10px] font-bold text-[#315b45]">{order.status}</span>
                    </div>
                    <p className="mt-3 text-xs text-slate-600">Delivery: {[order.deliveryAddress?.street, order.deliveryAddress?.area, order.deliveryAddress?.district].filter(Boolean).join(', ') || 'Address unavailable'}</p>
                    {(order.currentLocation || order.trackingNote) && <div className="mt-2 rounded-xl bg-[#f7f6f2] p-3 text-xs"><p className="font-semibold text-[#315b45]">{order.currentLocation || 'Location not set'}</p>{order.trackingNote && <p className="mt-1 leading-5 text-slate-600">{order.trackingNote}</p>}</div>}
                    <ol className="mt-3 flex flex-wrap gap-2">
                      {(order.statusHistory || []).map((entry, index) => <li key={`${entry.status}-${entry.createdAt}-${index}`} className="rounded-lg bg-[#f7f6f2] px-2.5 py-2 text-[10px]"><span className="font-semibold">{entry.status}</span><time className="ml-1 text-slate-400">{new Date(entry.createdAt).toLocaleDateString()}</time></li>)}
                    </ol>
                  </article>
                ))}
              </div>
            </section>
          </div>
        )}
      </main>
    </div>
  );
}

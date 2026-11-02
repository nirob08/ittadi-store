'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Check, ImagePlus, LogOut, MessageCircle, PackagePlus, RefreshCw, ShieldCheck, Trash2, Truck, Users } from 'lucide-react';

const initialForm = {
  name: '',
  category: 'Aesthetic Light',
  price: '',
  oldPrice: '',
  image: '',
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
const orderStatuses = ['Placed', 'Confirmed', 'Processing', 'Shipped', 'Out for delivery', 'Delivered', 'Cancelled'];

export default function AdminPanel() {
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [replyDrafts, setReplyDrafts] = useState({});
  const [formData, setFormData] = useState(initialForm);
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
    const timer = window.setInterval(() => void fetchAdminData(), 15000);
    return () => window.clearInterval(timer);
  }, [authenticated, fetchAdminData]);

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
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
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
        <section className="w-full max-w-md rounded-3xl border border-[#e9e6df] bg-white p-7 shadow-xl shadow-[#24352c]/5 sm:p-9">
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
    <div className="min-h-screen bg-[#f7f6f2] text-[#24352c]">
      <header className="border-b border-[#e9e6df] bg-white">
        <div className="flex w-full items-center justify-between gap-4 px-4 py-4 sm:px-8 lg:px-12">
          <div className="flex items-center gap-3">
            <img src="/favicon.png" alt="" className="h-10 w-10 rounded-xl object-cover" />
            <div>
              <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#829078]">Ittadi Store</p>
              <h1 className="font-serif text-xl sm:text-2xl">Product studio</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/" className="inline-flex items-center gap-2 rounded-full border border-[#e5e2dc] px-3 py-2 text-xs font-semibold text-slate-600 transition hover:border-[#829078] hover:text-[#24352c] sm:px-4 sm:text-sm">
              <ArrowLeft size={15} /> <span className="hidden sm:inline">Live store</span><span className="sm:hidden">Store</span>
            </Link>
            <button type="button" onClick={logout} className="inline-flex items-center gap-2 rounded-full bg-[#24352c] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#315b45] sm:px-4 sm:text-sm">
              <LogOut size={15} /> <span className="hidden sm:inline">Sign out</span>
            </button>
          </div>
        </div>
      </header>

      <main className="w-full space-y-7 px-4 py-8 sm:px-8 sm:py-10 lg:px-12">
        <section className="rounded-3xl bg-[#24352c] px-6 py-7 text-white sm:px-9 sm:py-9">
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

        <section className="rounded-3xl border border-[#e9e6df] bg-white p-5 shadow-sm sm:p-8">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#eaf0e8] text-[#315b45]"><PackagePlus size={19} /></div>
            <div>
              <h2 className="text-lg font-bold">Add a product</h2>
              <p className="mt-0.5 text-xs text-slate-500">It will appear in your live store as soon as it is published.</p>
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
                {categories.map((category) => <option key={category} value={category}>{category}</option>)}
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
              Product image URL
              <input type="url" required value={formData.image} onChange={(event) => setFormData({ ...formData, image: event.target.value })} className={fieldClass} placeholder="https://example.com/product.jpg" />
            </label>
            <label className="text-xs font-semibold text-[#47564b]">
              Stock quantity
              <input type="number" min="0" step="1" required value={formData.stock} onChange={(event) => setFormData({ ...formData, stock: event.target.value })} className={fieldClass} placeholder="10" />
            </label>
            <label className="text-xs font-semibold text-[#47564b] sm:col-span-2">
              Product badge (optional)
              <input maxLength={40} value={formData.badge} onChange={(event) => setFormData({ ...formData, badge: event.target.value })} className={fieldClass} placeholder="New arrival / Best seller" />
            </label>
            {formData.image && (
              <div className="flex items-center gap-3 rounded-xl border border-[#e9e6df] bg-[#faf9f6] p-3 lg:col-span-1">
                <ImagePlus size={18} className="shrink-0 text-[#829078]" />
                <img src={formData.image} alt="Product preview" className="h-12 w-12 rounded-lg object-cover" />
                <span className="truncate text-xs text-slate-500">Image preview</span>
              </div>
            )}
            <div className="sm:col-span-2 lg:col-span-3">
              <button disabled={saving} type="submit" className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#24352c] px-5 py-3.5 text-sm font-bold text-white transition hover:bg-[#315b45] disabled:cursor-wait disabled:opacity-60 sm:w-auto">
                {saving ? <RefreshCw size={16} className="animate-spin" /> : <PackagePlus size={16} />}
                {saving ? 'Publishing product…' : 'Publish product'}
              </button>
            </div>
          </form>
        </section>

        <section className="overflow-hidden rounded-3xl border border-[#e9e6df] bg-white shadow-sm">
          <div className="flex flex-col justify-between gap-3 border-b border-[#efede8] px-5 py-5 sm:flex-row sm:items-center sm:px-7">
            <div>
              <h2 className="text-lg font-bold">Your products</h2>
              <p className="mt-1 text-xs text-slate-500">The latest additions appear first.</p>
            </div>
            <button type="button" onClick={() => void fetchProducts()} className="inline-flex items-center gap-2 self-start rounded-full border border-[#e5e2dc] px-4 py-2 text-xs font-semibold text-slate-600 transition hover:border-[#829078] hover:text-[#24352c] sm:self-auto">
              <RefreshCw size={14} /> Refresh list
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[690px] text-left text-sm">
              <thead className="bg-[#faf9f6] text-[10px] font-bold uppercase tracking-[0.13em] text-slate-500">
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
                      <button type="button" onClick={() => void deleteProduct(product)} aria-label={`Delete ${product.name}`} className="inline-flex items-center gap-1.5 rounded-full border border-rose-100 px-3 py-2 text-xs font-semibold text-rose-600 transition hover:bg-rose-50">
                        <Trash2 size={14} /><span className="hidden sm:inline">Delete</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="overflow-hidden rounded-3xl border border-[#e9e6df] bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-[#efede8] px-5 py-5 sm:px-7">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#eaf0e8] text-[#315b45]"><Truck size={18} /></div>
              <div><h2 className="text-lg font-bold">Customer orders</h2><p className="mt-1 text-xs text-slate-500">{orders.length} recent order(s) · update delivery status here</p></div>
            </div>
            <button type="button" onClick={() => void fetchAdminData()} className="rounded-full border border-[#e5e2dc] px-4 py-2 text-xs font-semibold text-slate-600 hover:border-[#829078]">Refresh</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-left text-sm">
              <thead className="bg-[#faf9f6] text-[10px] font-bold uppercase tracking-[0.13em] text-slate-500">
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
                        <p className="mt-2 font-bold text-[#315b45]">৳ {order.total} · COD</p>
                      </td>
                      <td className="px-4 py-4">
                        <select aria-label={`Update status for ${order.orderNumber}`} value={order.status} disabled={order.status === 'Delivered' || order.status === 'Cancelled'} onChange={(event) => void updateOrderStatus(order._id, event.target.value)} className="rounded-xl border border-[#e5e2dc] bg-white px-3 py-2 text-xs font-semibold text-[#24352c] outline-none focus:border-[#58745d] disabled:bg-[#f5f3ed]">
                          {orderStatuses.map((status) => <option key={status} value={status}>{status}</option>)}
                        </select>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        <section className="overflow-hidden rounded-3xl border border-[#e9e6df] bg-white shadow-sm">
          <div className="flex items-center gap-3 border-b border-[#efede8] px-5 py-5 sm:px-7">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#eaf0e8] text-[#315b45]"><Users size={18} /></div>
            <div><h2 className="text-lg font-bold">Customers</h2><p className="mt-1 text-xs text-slate-500">{customers.length} registered customer(s)</p></div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px] text-left text-sm">
              <thead className="bg-[#faf9f6] text-[10px] font-bold uppercase tracking-[0.13em] text-slate-500"><tr><th className="px-5 py-3 sm:px-7">Customer</th><th className="px-4 py-3">Phone</th><th className="px-4 py-3">Joined</th><th className="px-5 py-3 text-right sm:px-7">Orders</th></tr></thead>
              <tbody className="divide-y divide-[#efede8]">
                {customers.length === 0 ? <tr><td colSpan="4" className="px-5 py-12 text-center text-sm text-slate-500">Registered customer details will appear here.</td></tr> : customers.map((customer) => (
                  <tr key={customer._id} className="hover:bg-[#faf9f6]">
                    <td className="px-5 py-4 sm:px-7"><p className="font-semibold">{customer.name}</p><p className="mt-1 text-xs text-slate-500">{customer.email}</p></td>
                    <td className="px-4 py-4 text-xs text-slate-600">
                      <p>{customer.phone || '—'}</p>
                      {customer.address?.street && <p className="mt-1 max-w-[260px] text-[10px] leading-4 text-slate-400">{customer.address.street}, {customer.address.area}, {customer.address.district}</p>}
                      {Number.isFinite(customer.location?.latitude) && Number.isFinite(customer.location?.longitude) && <a className="mt-1 inline-block text-[10px] font-semibold text-[#58745d] underline" href={`https://maps.google.com/?q=${customer.location.latitude},${customer.location.longitude}`} target="_blank" rel="noreferrer">Saved location</a>}
                    </td>
                    <td className="px-4 py-4 text-xs text-slate-500">{new Date(customer.createdAt).toLocaleDateString()}</td>
                    <td className="px-5 py-4 text-right text-xs font-semibold sm:px-7">{orders.filter((order) => String(order.customerId) === customer._id).length}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-3xl border border-[#e9e6df] bg-white p-5 shadow-sm sm:p-7">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#eaf0e8] text-[#315b45]"><MessageCircle size={18} /></div>
            <div><h2 className="text-lg font-bold">Customer support inbox</h2><p className="mt-1 text-xs text-slate-500">Reply directly to customer messages from here.</p></div>
          </div>
          <div className="mt-5 grid gap-4 xl:grid-cols-2">
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
        </section>
      </main>
    </div>
  );
}

'use client';

import { useCallback, useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import {
  Bell,
  Check,
  CircleUserRound,
  Crosshair,
  LogIn,
  MessageCircle,
  PackageCheck,
  Send,
  ShieldCheck,
  X,
} from 'lucide-react';

type Address = {
  street: string;
  area: string;
  district: string;
  postalCode: string;
};

type Location = { latitude: number; longitude: number };
type Customer = {
  id: string;
  name: string;
  email: string;
  phone: string;
  address?: Address;
  location?: Location;
};
type Order = {
  _id: string;
  orderNumber: string;
  total: number;
  status: string;
  statusHistory: { status: string; note: string; createdAt: string }[];
  items: { name: string; image: string; quantity: number; unitPrice: number }[];
  deliveryAddress: Address & { name: string; phone: string; location?: Location };
  createdAt: string;
};
type Message = { _id: string; sender: 'customer' | 'admin'; text: string; createdAt: string };
type Notice = {
  id: string;
  title: string;
  message: string;
  createdAt: string;
  product?: { name: string; image: string; price: number } | null;
};
type Tab = 'profile' | 'orders' | 'checkout' | 'support';
type HubProps = {
  checkoutItems: { productId: string; quantity: number }[] | null;
  onCheckoutComplete: () => void;
  onCloseCheckout: () => void;
};

const emptyAddress: Address = { street: '', area: '', district: '', postalCode: '' };
const inputClass = 'mt-1.5 w-full rounded-xl border border-[#e5e2dc] bg-white px-3.5 py-3 text-sm text-[#24352c] outline-none transition placeholder:text-slate-400 focus:border-[#58745d] focus:ring-4 focus:ring-[#58745d]/10';

function validLocation(value?: Location) {
  return value &&
    Number.isFinite(value.latitude) &&
    Number.isFinite(value.longitude)
    ? value
    : undefined;
}

async function responseJson(response: Response) {
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'The request could not be completed.');
  return result;
}

export default function CustomerHub({
  checkoutItems,
  onCheckoutComplete,
  onCloseCheckout,
}: HubProps) {
  const [panel, setPanel] = useState<'account' | 'notifications' | 'support' | null>(null);
  const [tab, setTab] = useState<Tab>('profile');
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [authForm, setAuthForm] = useState({ name: '', email: '', password: '' });
  const [profile, setProfile] = useState({
    name: '',
    phone: '',
    address: emptyAddress,
    location: undefined as Location | undefined,
  });
  const [orders, setOrders] = useState<Order[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [noticePermission, setNoticePermission] = useState('default');
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushConfigured, setPushConfigured] = useState(false);
  const [messageDraft, setMessageDraft] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [busy, setBusy] = useState(false);
  const activePanel = checkoutItems ? 'account' : panel;
  const activeTab = checkoutItems ? 'checkout' : tab;

  const loadSession = useCallback(async () => {
    try {
      const result = await responseJson(await fetch('/api/auth/session', { cache: 'no-store' }));
      setCustomer(result.customer);
      if (result.customer) {
        setProfile({
          name: result.customer.name || '',
          phone: result.customer.phone || '',
          address: { ...emptyAddress, ...(result.customer.address || {}) },
          location: validLocation(result.customer.location),
        });
      }
    } catch (sessionError) {
      setError(sessionError instanceof Error ? sessionError.message : 'Account details could not be loaded.');
    }
  }, []);

  const loadOrders = useCallback(async () => {
    try {
      const result = await responseJson(await fetch('/api/customer/orders', { cache: 'no-store' }));
      setOrders(result.orders);
    } catch (ordersError) {
      setError(ordersError instanceof Error ? ordersError.message : 'Your orders could not be loaded.');
    }
  }, []);

  const loadMessages = useCallback(async () => {
    try {
      const result = await responseJson(await fetch('/api/support/messages', { cache: 'no-store' }));
      setMessages(result.messages);
    } catch (messageError) {
      setError(messageError instanceof Error ? messageError.message : 'Support messages could not be loaded.');
    }
  }, []);

  const loadNotifications = useCallback(async () => {
    try {
      const result = await responseJson(await fetch('/api/notifications', { cache: 'no-store' }));
      setNotices(result.notifications);
      setError('');
    } catch (notificationError) {
      setError(notificationError instanceof Error ? notificationError.message : 'Notifications could not be loaded.');
    }
  }, []);

  useEffect(() => {
    let active = true;
    fetch('/api/auth/session', { cache: 'no-store' })
      .then(responseJson)
      .then((result) => {
        if (!active) return;
        setCustomer(result.customer);
        if (result.customer) {
          setProfile({
            name: result.customer.name || '',
            phone: result.customer.phone || '',
            address: { ...emptyAddress, ...(result.customer.address || {}) },
            location: validLocation(result.customer.location),
          });
        }
      })
      .catch((sessionError: unknown) => {
        if (active) setError(sessionError instanceof Error ? sessionError.message : 'Account details could not be loaded.');
      });
    fetch('/api/notifications', { cache: 'no-store' })
      .then(responseJson)
      .then((result) => {
        if (active) setNotices(result.notifications);
      })
      .catch((notificationError: unknown) => {
        if (active) setError(notificationError instanceof Error ? notificationError.message : 'Notifications could not be loaded.');
      });
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      navigator.serviceWorker.register('/sw.js').catch((registrationError: unknown) => {
        console.error('Browser notification worker could not be registered:', registrationError);
      });
    }
    fetch('/api/push/config')
      .then((response) => response.json())
      .then((result) => {
        if (!active) return;
        setPushConfigured(result.enabled === true);
        if ('Notification' in window) setNoticePermission(Notification.permission);
      })
      .catch((configError: unknown) => {
        console.error('Browser notification configuration could not be checked:', configError);
      });

    const params = new URLSearchParams(window.location.search);
    const googleError = params.get('google');
    const messagesByReason: Record<string, string> = {
      'not-configured': 'Google sign-in is not set up yet. You can use email and password in the meantime.',
      invalid_state: 'Google sign-in expired. Please try again.',
      google_failed: 'Google sign-in could not be completed. Please try again.',
      unverified_email: 'Google sign-in requires a verified email address.',
    };
    if (googleError) {
      Promise.resolve().then(() => {
        if (!active) return;
        setError(messagesByReason[googleError] || 'Google sign-in could not be completed.');
        setPanel('account');
      });
    }
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!customer || (activeTab !== 'orders' && activeTab !== 'support')) return undefined;
    let active = true;
    const url = activeTab === 'orders' ? '/api/customer/orders' : '/api/support/messages';
    fetch(url, { cache: 'no-store' })
      .then(responseJson)
      .then((result) => {
        if (!active) return;
        if (activeTab === 'orders') setOrders(result.orders);
        else setMessages(result.messages);
      })
      .catch((loadError: unknown) => {
        if (active) setError(loadError instanceof Error ? loadError.message : 'Account data could not be loaded.');
      });
    return () => {
      active = false;
    };
  }, [activeTab, customer]);

  useEffect(() => {
    if (!activePanel) return undefined;
    const timer = window.setInterval(() => {
      if (activePanel === 'notifications') void loadNotifications();
      if (activePanel === 'support' || (activePanel === 'account' && activeTab === 'support')) void loadMessages();
      if (activePanel === 'account' && activeTab === 'orders') void loadOrders();
    }, 12000);
    return () => window.clearInterval(timer);
  }, [activePanel, activeTab, loadMessages, loadNotifications, loadOrders]);

  const showPanel = (nextPanel: 'account' | 'notifications' | 'support') => {
    setError('');
    setSuccess('');
    setPanel(nextPanel);
    if (nextPanel === 'support') setTab('support');
    if (nextPanel === 'notifications') void loadNotifications();
    if (nextPanel === 'account') void loadSession();
  };

  const handleAuth = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    setSuccess('');
    try {
      const endpoint = authMode === 'register' ? '/api/auth/register' : '/api/auth/login';
      const result = await responseJson(await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(authForm),
      }));
      setCustomer(result.customer);
      setProfile({
        name: result.customer.name || '',
        phone: result.customer.phone || '',
        address: { ...emptyAddress, ...(result.customer.address || {}) },
        location: validLocation(result.customer.location),
      });
      setAuthForm({ name: '', email: '', password: '' });
      setSuccess(authMode === 'register' ? 'Your account is ready.' : 'Welcome back.');
      if (!checkoutItems) setTab('profile');
    } catch (authError) {
      setError(authError instanceof Error ? authError.message : 'Sign-in failed.');
    } finally {
      setBusy(false);
    }
  };

  const saveProfile = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    setSuccess('');
    try {
      const result = await responseJson(await fetch('/api/customer/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile),
      }));
      setCustomer(result.customer);
      setProfile({
        name: result.customer.name,
        phone: result.customer.phone,
        address: { ...emptyAddress, ...result.customer.address },
        location: validLocation(result.customer.location),
      });
      setSuccess('Your details have been saved.');
    } catch (profileError) {
      setError(profileError instanceof Error ? profileError.message : 'Your profile could not be saved.');
    } finally {
      setBusy(false);
    }
  };

  const captureLocation = () => {
    setError('');
    if (!navigator.geolocation) {
      setError('Location services are not available in this browser.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setProfile((current) => ({
          ...current,
          location: {
            latitude: Number(position.coords.latitude.toFixed(6)),
            longitude: Number(position.coords.longitude.toFixed(6)),
          },
        }));
        setSuccess('Location captured. Save your profile to keep it.');
      },
      (locationError) => {
        setError(locationError.code === locationError.PERMISSION_DENIED
          ? 'Location access was declined. You can enter your delivery address manually.'
          : 'Your location could not be found. Please enter the address manually.');
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 },
    );
  };

  const placeOrder = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!checkoutItems?.length) return;
    setBusy(true);
    setError('');
    setSuccess('');
    try {
      const result = await responseJson(await fetch('/api/customer/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: checkoutItems,
          deliveryAddress: { ...profile, ...profile.address, location: profile.location },
        }),
      }));
      onCheckoutComplete();
      setSuccess(`Order ${result.order.orderNumber} placed successfully.`);
      setOrders((current) => [result.order, ...current]);
      setTab('orders');
    } catch (orderError) {
      setError(orderError instanceof Error ? orderError.message : 'Your order could not be placed.');
    } finally {
      setBusy(false);
    }
  };

  const sendMessage = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const text = messageDraft.trim();
    if (!text) return;
    setBusy(true);
    setError('');
    try {
      const result = await responseJson(await fetch('/api/support/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      }));
      setMessages((current) => [...current, result.message]);
      setMessageDraft('');
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : 'Your message could not be sent.');
    } finally {
      setBusy(false);
    }
  };

  const enablePush = async () => {
    setError('');
    if (!pushConfigured) {
      setError('Browser alerts are not configured yet. In-app product notifications are still available.');
      return;
    }
    if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
      setError('This browser does not support push notifications.');
      return;
    }
    try {
      const permission = await Notification.requestPermission();
      setNoticePermission(permission);
      if (permission !== 'granted') throw new Error('Please allow notifications in your browser settings.');
      const configResponse = await responseJson(await fetch('/api/push/config'));
      const registration = await navigator.serviceWorker.ready;
      const existing = await registration.pushManager.getSubscription();
      const subscription = existing || await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: decodeBase64Url(configResponse.publicKey),
      });
      await responseJson(await fetch('/api/push/subscriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(subscription.toJSON()),
      }));
      setPushEnabled(true);
      setSuccess('Browser notifications are enabled for new products.');
    } catch (pushError) {
      setError(pushError instanceof Error ? pushError.message : 'Browser notifications could not be enabled.');
    }
  };

  const signOut = async () => {
    try {
      await responseJson(await fetch('/api/auth/session', { method: 'DELETE' }));
      setCustomer(null);
      setOrders([]);
      setMessages([]);
      setSuccess('You have signed out.');
      if (checkoutItems) setTab('checkout');
    } catch (logoutError) {
      setError(logoutError instanceof Error ? logoutError.message : 'Sign-out failed.');
    }
  };

  return (
    <>
      <div className="fixed bottom-4 right-4 z-40 flex flex-col gap-2 sm:bottom-6 sm:right-6">
        <button type="button" onClick={() => showPanel('notifications')} aria-label="Open product notifications" className="relative flex h-12 w-12 items-center justify-center rounded-full border border-white/15 bg-[#d49a54] text-white shadow-xl transition hover:-translate-y-0.5 hover:bg-[#bd8240]">
          <Bell size={20} />
        </button>
        <button type="button" onClick={() => showPanel('support')} aria-label="Chat with customer support" className="flex h-12 w-12 items-center justify-center rounded-full bg-[#315b45] text-white shadow-xl transition hover:-translate-y-0.5 hover:bg-[#24352c]">
          <MessageCircle size={21} />
        </button>
        <button type="button" onClick={() => showPanel('account')} aria-label={customer ? 'Open customer profile' : 'Sign in or register'} className="flex h-12 w-12 items-center justify-center rounded-full bg-[#24352c] text-white shadow-xl transition hover:-translate-y-0.5 hover:bg-[#18251f]">
          {customer ? <CircleUserRound size={21} /> : <LogIn size={20} />}
        </button>
      </div>

      {activePanel && (
        <div className="fixed inset-0 z-[70] flex items-end justify-center bg-slate-950/45 p-0 backdrop-blur-sm sm:items-center sm:p-5" onMouseDown={(event) => {
          if (event.target === event.currentTarget && !busy) {
            setPanel(null);
            if (checkoutItems) onCloseCheckout();
          }
        }}>
          <section aria-label={panel === 'notifications' ? 'Product notifications' : panel === 'support' ? 'Customer support chat' : 'Customer account'} aria-modal="true" role="dialog" className="flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-[2rem] border border-[#e9e6df] bg-[#faf9f6] shadow-2xl sm:max-h-[88vh] sm:max-w-2xl sm:rounded-[2rem]">
            <header className="flex items-start justify-between gap-4 border-b border-[#e9e6df] bg-white px-5 py-4 sm:px-7">
              <div>
                <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#829078]">Ittadi customer care</p>
                <h2 className="mt-1 font-serif text-2xl text-[#24352c] sm:text-3xl">
                    {activePanel === 'notifications' ? 'Little updates' : activePanel === 'support' ? 'We are here to help.' : customer ? `Hello, ${customer.name.split(' ')[0]}.` : 'Your Ittadi account'}
                </h2>
              </div>
              <button type="button" onClick={() => { setPanel(null); if (checkoutItems) onCloseCheckout(); }} aria-label="Close customer panel" className="rounded-full p-2 text-slate-500 transition hover:bg-[#f5f3ed]"><X size={20} /></button>
            </header>

            {activePanel === 'notifications' ? (
              <>
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e9e6df] px-5 py-3 sm:px-7">
                  <p className="text-xs text-slate-500">News and new arrivals from Ittadi.</p>
                  {pushConfigured && (
                    <button type="button" disabled={pushEnabled || noticePermission === 'denied'} onClick={() => void enablePush()} className="inline-flex items-center gap-2 rounded-full bg-[#24352c] px-4 py-2 text-[10px] font-bold text-white transition hover:bg-[#315b45] disabled:opacity-50">
                      <Bell size={13} /> {pushEnabled ? 'Alerts enabled' : noticePermission === 'denied' ? 'Allow in browser settings' : 'Enable browser alerts'}
                    </button>
                  )}
                </div>
                {error && <p role="alert" className="mx-5 mt-4 rounded-xl bg-rose-50 px-4 py-3 text-xs text-rose-700 sm:mx-7">{error}</p>}
                <div className="flex-1 space-y-3 overflow-y-auto p-5 sm:p-7">
                  {notices.length === 0 ? (
                    <div className="py-12 text-center">
                      <Bell className="mx-auto text-[#829078]" size={28} />
                      <p className="mt-4 font-serif text-xl text-[#24352c]">No new arrivals just yet.</p>
                      <p className="mt-2 text-xs text-slate-500">New product announcements will show up here.</p>
                    </div>
                  ) : notices.map((notice) => (
                    <article key={notice.id} className="flex gap-3 rounded-2xl border border-[#e9e6df] bg-white p-3.5">
                      {notice.product?.image && <img src={notice.product.image} alt="" className="h-14 w-14 shrink-0 rounded-xl object-cover" />}
                      <div className="min-w-0 flex-1">
                        <h3 className="text-sm font-bold text-[#24352c]">{notice.title}</h3>
                        <p className="mt-1 text-xs leading-5 text-slate-500">{notice.message}</p>
                        <time className="mt-2 block text-[10px] text-slate-400">{new Date(notice.createdAt).toLocaleString()}</time>
                      </div>
                    </article>
                  ))}
                </div>
              </>
            ) : !customer ? (
              <div className="overflow-y-auto p-5 sm:p-8">
                <p className="max-w-lg text-sm leading-6 text-slate-500">
                  {activePanel === 'support'
                    ? 'Sign in to send a message to our team and continue your conversation any time.'
                    : tab === 'checkout'
                      ? 'Sign in or create a free account to place your order and track delivery.'
                      : 'Sign in to manage your details, see delivery updates and contact our team.'}
                </p>
                {error && <p role="alert" className="mt-4 rounded-xl bg-rose-50 px-4 py-3 text-xs text-rose-700">{error}</p>}
                {success && <p role="status" className="mt-4 rounded-xl bg-emerald-50 px-4 py-3 text-xs text-emerald-800">{success}</p>}
                <a href="/api/auth/google" className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl border border-[#e5e2dc] bg-white px-4 py-3 text-sm font-semibold text-[#24352c] transition hover:border-[#829078]">
                  <GoogleMark /> Continue with Google
                </a>
                <div className="my-5 flex items-center gap-3 text-[10px] text-slate-400"><span className="h-px flex-1 bg-[#e9e6df]" /> OR CONTINUE WITH EMAIL <span className="h-px flex-1 bg-[#e9e6df]" /></div>
                <form onSubmit={handleAuth} className="grid gap-3 sm:grid-cols-2">
                  {authMode === 'register' && (
                    <label className="text-xs font-semibold text-[#47564b] sm:col-span-2">Your name
                      <input className={inputClass} required minLength={2} maxLength={120} autoComplete="name" value={authForm.name} onChange={(event) => setAuthForm({ ...authForm, name: event.target.value })} placeholder="Full name" />
                    </label>
                  )}
                  <label className="text-xs font-semibold text-[#47564b] sm:col-span-2">Email address
                    <input className={inputClass} type="email" required autoComplete="email" value={authForm.email} onChange={(event) => setAuthForm({ ...authForm, email: event.target.value })} placeholder="you@example.com" />
                  </label>
                  <label className="text-xs font-semibold text-[#47564b] sm:col-span-2">Password
                    <input className={inputClass} type="password" required minLength={authMode === 'register' ? 8 : undefined} autoComplete={authMode === 'register' ? 'new-password' : 'current-password'} value={authForm.password} onChange={(event) => setAuthForm({ ...authForm, password: event.target.value })} placeholder={authMode === 'register' ? 'At least 8 characters' : 'Your password'} />
                  </label>
                  <button disabled={busy} type="submit" className="mt-1 rounded-xl bg-[#24352c] px-4 py-3 text-sm font-bold text-white transition hover:bg-[#315b45] disabled:opacity-60 sm:col-span-2">
                    {busy ? 'Please wait…' : authMode === 'register' ? 'Create account' : 'Sign in'}
                  </button>
                </form>
                <button type="button" onClick={() => { setAuthMode(authMode === 'login' ? 'register' : 'login'); setError(''); }} className="mt-4 w-full text-center text-xs font-semibold text-[#58745d] underline underline-offset-4">
                  {authMode === 'login' ? 'New here? Create an account' : 'Already have an account? Sign in'}
                </button>
              </div>
            ) : (
              <>
                <nav aria-label="Customer account tabs" className="flex gap-1 overflow-x-auto border-b border-[#e9e6df] bg-white px-4 py-2 sm:px-7">
                  {([
                    ['profile', 'Profile'],
                    ['orders', 'My orders'],
                    ['checkout', 'Checkout'],
                    ['support', 'Support'],
                  ] as [Tab, string][]).filter(([item]) => item !== 'checkout' || Boolean(checkoutItems)).map(([item, label]) => (
                    <button key={item} type="button" onClick={() => { setTab(item); setError(''); if (item === 'orders') void loadOrders(); if (item === 'support') void loadMessages(); }} className={`shrink-0 rounded-full px-3.5 py-2 text-xs font-semibold transition ${tab === item ? 'bg-[#24352c] text-white' : 'text-slate-500 hover:bg-[#f5f3ed] hover:text-[#24352c]'}`}>
                      {label}
                    </button>
                  ))}
                  <button type="button" onClick={() => void signOut()} className="ml-auto shrink-0 rounded-full px-3 py-2 text-xs font-semibold text-slate-400 hover:bg-[#f5f3ed] hover:text-rose-600">Sign out</button>
                </nav>

                {error && <p role="alert" className="mx-5 mt-4 rounded-xl bg-rose-50 px-4 py-3 text-xs text-rose-700 sm:mx-7">{error}</p>}
                {success && <p role="status" className="mx-5 mt-4 rounded-xl bg-emerald-50 px-4 py-3 text-xs text-emerald-800 sm:mx-7">{success}</p>}

                <div className="min-h-0 flex-1 overflow-y-auto p-5 sm:p-7">
                  {activeTab === 'profile' && (
                    <form onSubmit={saveProfile} className="grid gap-4 sm:grid-cols-2">
                      <label className="text-xs font-semibold text-[#47564b]">Full name
                        <input className={inputClass} required minLength={2} maxLength={120} value={profile.name} onChange={(event) => setProfile({ ...profile, name: event.target.value })} />
                      </label>
                      <label className="text-xs font-semibold text-[#47564b]">Email
                        <input className={`${inputClass} bg-[#f5f3ed]`} readOnly value={customer.email} />
                      </label>
                      <label className="text-xs font-semibold text-[#47564b] sm:col-span-2">Phone number
                        <input className={inputClass} type="tel" autoComplete="tel" value={profile.phone} onChange={(event) => setProfile({ ...profile, phone: event.target.value })} placeholder="+880 1XXX-XXXXXX" />
                      </label>
                      <label className="text-xs font-semibold text-[#47564b] sm:col-span-2">Street address
                        <input className={inputClass} autoComplete="street-address" value={profile.address.street} onChange={(event) => setProfile({ ...profile, address: { ...profile.address, street: event.target.value } })} placeholder="House, road and street" />
                      </label>
                      <label className="text-xs font-semibold text-[#47564b]">Area / thana
                        <input className={inputClass} autoComplete="address-level3" value={profile.address.area} onChange={(event) => setProfile({ ...profile, address: { ...profile.address, area: event.target.value } })} placeholder="Mirpur" />
                      </label>
                      <label className="text-xs font-semibold text-[#47564b]">District
                        <input className={inputClass} autoComplete="address-level1" value={profile.address.district} onChange={(event) => setProfile({ ...profile, address: { ...profile.address, district: event.target.value } })} placeholder="Dhaka" />
                      </label>
                      <label className="text-xs font-semibold text-[#47564b]">Postcode (optional)
                        <input className={inputClass} autoComplete="postal-code" value={profile.address.postalCode} onChange={(event) => setProfile({ ...profile, address: { ...profile.address, postalCode: event.target.value } })} placeholder="1216" />
                      </label>
                      <div className="flex items-end">
                        <button type="button" onClick={captureLocation} className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-[#d9d5cc] px-3 py-3 text-xs font-semibold text-[#315b45] transition hover:border-[#58745d]">
                          <Crosshair size={15} /> {profile.location ? 'Update saved location' : 'Use my current location'}
                        </button>
                      </div>
                      {profile.location && <p className="text-[10px] text-[#58745d] sm:col-span-2">Location captured: {profile.location.latitude}, {profile.location.longitude}</p>}
                      <div className="flex flex-wrap items-center gap-2 sm:col-span-2">
                        <button disabled={busy} type="submit" className="inline-flex items-center gap-2 rounded-xl bg-[#24352c] px-5 py-3 text-xs font-bold text-white transition hover:bg-[#315b45] disabled:opacity-60"><Check size={15} /> Save details</button>
                        <span className="text-[10px] text-slate-400">Location is only shared when you choose to capture it.</span>
                      </div>
                    </form>
                  )}

                  {activeTab === 'checkout' && (
                    <form onSubmit={placeOrder} className="space-y-5">
                      <div className="rounded-2xl bg-white p-4">
                        <div className="flex items-center gap-2 text-sm font-bold text-[#24352c]"><PackageCheck size={17} className="text-[#58745d]" /> Cash on delivery</div>
                        <p className="mt-1 text-xs text-slate-500">Pay when your order arrives. You can follow each status from My orders.</p>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <label className="text-xs font-semibold text-[#47564b]">Recipient name<input className={inputClass} required minLength={2} value={profile.name} onChange={(event) => setProfile({ ...profile, name: event.target.value })} /></label>
                        <label className="text-xs font-semibold text-[#47564b]">Phone number<input className={inputClass} required type="tel" value={profile.phone} onChange={(event) => setProfile({ ...profile, phone: event.target.value })} placeholder="+880 1XXX-XXXXXX" /></label>
                        <label className="text-xs font-semibold text-[#47564b] sm:col-span-2">Delivery address<input className={inputClass} required value={profile.address.street} onChange={(event) => setProfile({ ...profile, address: { ...profile.address, street: event.target.value } })} placeholder="House, road and street" /></label>
                        <label className="text-xs font-semibold text-[#47564b]">Area / thana<input className={inputClass} required value={profile.address.area} onChange={(event) => setProfile({ ...profile, address: { ...profile.address, area: event.target.value } })} placeholder="Mirpur" /></label>
                        <label className="text-xs font-semibold text-[#47564b]">District<input className={inputClass} required value={profile.address.district} onChange={(event) => setProfile({ ...profile, address: { ...profile.address, district: event.target.value } })} placeholder="Dhaka" /></label>
                      </div>
                      <button type="button" onClick={captureLocation} className="inline-flex items-center gap-2 text-xs font-semibold text-[#58745d] underline underline-offset-4"><Crosshair size={14} /> {profile.location ? 'Update delivery location' : 'Add current location (optional)'}</button>
                      {checkoutItems?.length && <p className="text-xs text-slate-500">{checkoutItems.reduce((sum, item) => sum + item.quantity, 0)} item(s) in this order</p>}
                      <button type="submit" disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#24352c] px-5 py-3.5 text-sm font-bold text-white transition hover:bg-[#315b45] disabled:opacity-60">
                        <ShieldCheck size={17} /> {busy ? 'Placing order…' : 'Place cash-on-delivery order'}
                      </button>
                    </form>
                  )}

                  {activeTab === 'orders' && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between gap-3"><p className="text-xs text-slate-500">Track your recent deliveries and status updates.</p><button type="button" onClick={() => void loadOrders()} className="text-[10px] font-bold text-[#58745d]">Refresh</button></div>
                      {orders.length === 0 ? <div className="py-12 text-center"><PackageCheck className="mx-auto text-[#829078]" size={28} /><p className="mt-3 font-serif text-xl text-[#24352c]">No orders just yet.</p><p className="mt-2 text-xs text-slate-500">Your orders will appear here after checkout.</p></div> : orders.map((order) => (
                        <article key={order._id} className="rounded-2xl border border-[#e9e6df] bg-white p-4 sm:p-5">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div><p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#829078]">{order.orderNumber}</p><time className="mt-1 block text-[10px] text-slate-400">{new Date(order.createdAt).toLocaleString()}</time></div>
                            <span className="rounded-full bg-[#eaf0e8] px-3 py-1.5 text-[10px] font-bold text-[#315b45]">{order.status}</span>
                          </div>
                          <div className="mt-4 space-y-2 border-y border-[#efede8] py-3">
                            {order.items.map((item, index) => <div key={`${item.name}-${index}`} className="flex justify-between gap-3 text-xs"><span className="text-slate-600">{item.name} × {item.quantity}</span><span className="font-semibold text-[#24352c]">৳ {item.unitPrice * item.quantity}</span></div>)}
                          </div>
                          <div className="mt-3 flex items-center justify-between text-xs"><span className="text-slate-500">Cash on delivery</span><strong>Total ৳ {order.total}</strong></div>
                          <ol className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                            {order.statusHistory.map((entry, index) => <li key={`${entry.status}-${entry.createdAt}-${index}`} className={`rounded-xl px-2.5 py-2 ${index === order.statusHistory.length - 1 ? 'bg-[#eaf0e8] text-[#315b45]' : 'bg-[#f7f6f2] text-slate-500'}`}><p className="text-[10px] font-bold">{entry.status}</p><time className="mt-1 block text-[9px] opacity-70">{new Date(entry.createdAt).toLocaleDateString()}</time></li>)}
                          </ol>
                        </article>
                      ))}
                    </div>
                  )}

                  {activeTab === 'support' && (
                    <div className="flex min-h-[360px] flex-col">
                      <p className="mb-4 text-xs leading-5 text-slate-500">Send our team a message. Replies will appear here while you are signed in.</p>
                      <div className="flex-1 space-y-3 overflow-y-auto rounded-2xl bg-white p-4">
                        {messages.length === 0 ? <p className="py-12 text-center text-xs text-slate-400">No messages yet. How can we help?</p> : messages.map((message) => (
                          <div key={message._id} className={`flex ${message.sender === 'customer' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 ${message.sender === 'customer' ? 'rounded-br-md bg-[#24352c] text-white' : 'rounded-bl-md bg-[#f1f0eb] text-[#24352c]'}`}>
                              <p className="whitespace-pre-wrap text-xs leading-5">{message.text}</p>
                              <time className={`mt-1 block text-[9px] ${message.sender === 'customer' ? 'text-white/55' : 'text-slate-400'}`}>{new Date(message.createdAt).toLocaleString()}</time>
                            </div>
                          </div>
                        ))}
                      </div>
                      <form onSubmit={sendMessage} className="mt-3 flex items-end gap-2">
                        <textarea aria-label="Your support message" rows={2} maxLength={2000} required value={messageDraft} onChange={(event) => setMessageDraft(event.target.value)} className="w-full resize-none rounded-xl border border-[#e5e2dc] bg-white px-3.5 py-3 text-sm outline-none focus:border-[#58745d]" placeholder="Write a message…" />
                        <button type="submit" disabled={busy || !messageDraft.trim()} aria-label="Send message" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#24352c] text-white transition hover:bg-[#315b45] disabled:opacity-50"><Send size={17} /></button>
                      </form>
                    </div>
                  )}
                </div>
              </>
            )}
          </section>
        </div>
      )}
    </>
  );
}

function decodeBase64Url(value: string) {
  const padding = '='.repeat((4 - value.length % 4) % 4);
  const base64 = (value + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = window.atob(base64);
  return Uint8Array.from(raw, (character) => character.charCodeAt(0));
}

function GoogleMark() {
  return (
    <svg aria-hidden="true" viewBox="0 0 48 48" className="h-4 w-4">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5Z" transform="translate(0 5)" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.74 7.18l7.66 5.94c4.47-4.13 7.12-10.2 7.12-17.59Z" transform="translate(0 -1)" />
      <path fill="#FBBC05" d="M10.53 28.59a14.48 14.48 0 0 1 0-9.18l-7.98-6.19a23.99 23.99 0 0 0 0 21.56l7.98-6.19Z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.9-5.8l-7.66-5.94c-2.13 1.43-4.84 2.28-8.24 2.28-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48Z" />
    </svg>
  );
}

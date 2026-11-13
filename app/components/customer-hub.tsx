'use client';

import { useCallback, useEffect, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import Link from 'next/link';
import { getDeliveryFee } from '@/lib/delivery';
import {
  ArrowLeft,
  Bell,
  Camera,
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
  avatarUrl?: string;
  phone: string;
  address?: Address;
  location?: Location;
};
type Order = {
  _id: string;
  orderNumber: string;
  total: number;
  subtotal?: number;
  deliveryFee?: number;
  paymentMethod: string;
  paymentStatus: string;
  paymentReference?: string;
  status: string;
  currentLocation?: string;
  trackingNote?: string;
  statusHistory?: { status: string; note: string; createdAt: string }[];
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
type CheckoutItem = {
  productId: string;
  quantity: number;
  name: string;
  unitPrice: number;
  image: string;
};
type HubProps = {
  checkoutItems: CheckoutItem[] | null;
  onCheckoutComplete?: () => void;
  onCloseCheckout?: () => void;
  accountPage?: boolean;
};
type PaymentMethod = 'Cash on delivery' | 'SSLCOMMERZ' | 'Manual bKash' | 'Manual Nagad';
type PaymentOptions = {
  sslcommerzEnabled: boolean;
  walletNumbers: { bkash: string; nagad: string };
};
const emptyAddress: Address = { street: '', area: '', district: '', postalCode: '' };
const defaultPaymentOptions: PaymentOptions = {
  sslcommerzEnabled: false,
  walletNumbers: { bkash: '01830287623', nagad: '01830287623' },
};
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

function CustomerHub({
  checkoutItems,
  onCheckoutComplete = () => {},
  onCloseCheckout = () => {},
  accountPage = false,
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
    avatarUrl: '',
  });
  const [orders, setOrders] = useState<Order[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Cash on delivery');
  const [paymentReference, setPaymentReference] = useState('');
  const [paymentOptions, setPaymentOptions] = useState<PaymentOptions>(defaultPaymentOptions);
  const [messages, setMessages] = useState<Message[]>([]);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [noticePermission, setNoticePermission] = useState('default');
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushConfigured, setPushConfigured] = useState(false);
  const [messageDraft, setMessageDraft] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [busy, setBusy] = useState(false);
  const activePanel = accountPage ? 'account' : checkoutItems ? 'account' : panel;
  const activeTab = checkoutItems ? 'checkout' : tab;
  const initials = customer?.name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase() || 'IT';
  const checkoutSubtotal = checkoutItems?.reduce(
    (total, item) => total + item.unitPrice * item.quantity,
    0,
  ) ?? 0;
  const checkoutDeliveryFee = getDeliveryFee(profile.address.district);

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
          avatarUrl: result.customer.avatarUrl || '',
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
            avatarUrl: result.customer.avatarUrl || '',
          });
          if (accountPage) {
            fetch('/api/customer/orders', { cache: 'no-store' })
              .then(responseJson)
              .then((orderResult) => {
                if (active) setOrders(orderResult.orders);
              })
              .catch((ordersError: unknown) => {
                if (active) setError(ordersError instanceof Error ? ordersError.message : 'Your orders could not be loaded.');
              });
          }
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
    const accountWelcome = params.get('account') === 'welcome';
    if (googleError || accountWelcome) {
      params.delete('google');
      params.delete('account');
      const query = params.toString();
      window.history.replaceState(
        null,
        '',
        `${window.location.pathname}${query ? `?${query}` : ''}${window.location.hash}`,
      );
      Promise.resolve().then(() => {
        if (!active) return;
        setPanel('account');
        if (googleError) {
          setError(messagesByReason[googleError] || 'Google sign-in could not be completed.');
        } else {
          setSuccess('You are signed in with Google. Welcome to Ittadi!');
        }
      });
    }
    return () => {
      active = false;
    };
  }, [accountPage]);

  useEffect(() => {
    let active = true;
    fetch('/api/customer/payment-config', { cache: 'no-store' })
      .then(responseJson)
      .then((result) => {
        if (active) setPaymentOptions(result);
      })
      .catch((configError: unknown) => {
        if (active) setError(configError instanceof Error ? configError.message : 'Payment options could not be loaded.');
      });

    const paymentResult = new URLSearchParams(window.location.search).get('payment');
    const returnedOrder = new URLSearchParams(window.location.search).get('order');
    Promise.resolve().then(() => {
      if (!active) return;
      if (paymentResult === 'paid') {
        setSuccess(`Payment verified${returnedOrder ? ` for order ${returnedOrder}` : ''}.`);
      } else if (paymentResult === 'review') {
        setSuccess(`Payment received and is being reviewed${returnedOrder ? ` for order ${returnedOrder}` : ''}.`);
      } else if (paymentResult === 'verification') {
        setError(`Payment could not be confirmed yet${returnedOrder ? ` for order ${returnedOrder}` : ''}. Please contact support before paying again.`);
      }
    });

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

  const showPanel = useCallback((nextPanel: 'account' | 'notifications' | 'support') => {
    setError('');
    setSuccess('');
    setPanel(nextPanel);
    if (nextPanel === 'support') setTab('support');
    if (nextPanel === 'notifications') void loadNotifications();
    if (nextPanel === 'account') void loadSession();
  }, [loadNotifications, loadSession]);

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
        avatarUrl: result.customer.avatarUrl || '',
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
        avatarUrl: result.customer.avatarUrl || '',
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

  const chooseAvatar = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setError('');
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setError('Choose a JPG, PNG or WebP image for your profile photo.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('Choose a photo smaller than 5 MB.');
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    try {
      const image = new Image();
      await new Promise<void>((resolve, reject) => {
        image.onload = () => resolve();
        image.onerror = () => reject(new Error('This photo could not be opened.'));
        image.src = objectUrl;
      });
      const scale = Math.min(1, 512 / Math.max(image.naturalWidth, image.naturalHeight));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
      const context = canvas.getContext('2d');
      if (!context) throw new Error('Photo editing is not supported in this browser.');
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      let avatarUrl = canvas.toDataURL('image/jpeg', 0.78);
      if (avatarUrl.length > 350000) avatarUrl = canvas.toDataURL('image/jpeg', 0.58);
      if (avatarUrl.length > 350000) throw new Error('This photo could not be compressed enough. Please choose another one.');
      setProfile((current) => ({ ...current, avatarUrl }));
      setSuccess('Photo ready. Save your profile to keep the change.');
    } catch (photoError) {
      setError(photoError instanceof Error ? photoError.message : 'Your profile photo could not be processed.');
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
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
          items: checkoutItems.map(({ productId, quantity }) => ({ productId, quantity })),
          deliveryAddress: { ...profile, ...profile.address, location: profile.location },
          paymentMethod,
          paymentReference: paymentMethod.startsWith('Manual ') ? paymentReference.trim() : '',
        }),
      }));
      setPanel('account');
      onCheckoutComplete();
      setOrders((current) => [result.order, ...current]);
      setTab('orders');
      if (result.paymentUrl) {
        window.location.assign(result.paymentUrl);
        return;
      }
      setPaymentReference('');
      setSuccess(paymentMethod.startsWith('Manual ')
        ? `Order ${result.order.orderNumber} received. Payment is pending admin verification.`
        : `Order ${result.order.orderNumber} placed successfully.`);
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
      {!accountPage && <div className="customer-actions backdrop-blur-xl backdrop-saturate-150 fixed bottom-4 right-4 z-40 flex flex-col gap-2 sm:bottom-6 sm:right-6">
        <button type="button" onClick={() => showPanel('notifications')} aria-label="Open product notifications" className="relative flex h-12 w-12 items-center justify-center rounded-full border border-white/15 bg-[#d49a54] text-white shadow-xl transition hover:-translate-y-0.5 hover:bg-[#bd8240]">
          <Bell size={20} />
        </button>
        <button type="button" onClick={() => showPanel('support')} aria-label="Chat with customer support" className="flex h-12 w-12 items-center justify-center rounded-full bg-[#315b45] text-white shadow-xl transition hover:-translate-y-0.5 hover:bg-[#24352c]">
          <MessageCircle size={21} />
        </button>
        <Link href="/account" target="_blank" rel="noopener noreferrer" aria-label={customer ? 'Open customer profile' : 'Sign in or register'} className="flex h-12 w-12 items-center justify-center rounded-full bg-[#24352c] text-white shadow-xl transition hover:-translate-y-0.5 hover:bg-[#18251f]">
          {customer ? <CircleUserRound size={21} /> : <LogIn size={20} />}
        </Link>
      </div>}

      {activePanel && (
        <div className={accountPage ? 'customer-hub-shell mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:py-12' : 'fixed inset-0 z-[70] flex items-end justify-center bg-slate-950/45 p-0 backdrop-blur-sm sm:items-center sm:p-5'} onMouseDown={!accountPage ? (event) => {
          if (event.target === event.currentTarget && !busy) {
            setPanel(null);
            if (checkoutItems) onCloseCheckout();
          }
        } : undefined}>
          <section aria-label={panel === 'notifications' ? 'Product notifications' : panel === 'support' ? 'Customer support chat' : 'Customer account'} aria-modal={accountPage ? undefined : true} role={accountPage ? undefined : 'dialog'} className={accountPage ? 'customer-hub-panel glass-panel backdrop-blur-2xl backdrop-saturate-150 flex min-h-[65vh] w-full flex-col overflow-hidden rounded-[2rem] bg-[#faf9f6] shadow-[0_24px_80px_-40px_rgba(36,53,44,0.3)]' : 'customer-hub-panel glass-panel backdrop-blur-2xl backdrop-saturate-150 flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-[2rem] bg-[#faf9f6] shadow-2xl sm:max-h-[88vh] sm:max-w-2xl sm:rounded-[2rem]'}>
            <header className="glass-nav backdrop-blur-xl backdrop-saturate-150 flex items-start justify-between gap-4 border-b border-[#e9e6df] px-5 py-4 sm:px-7">
              <div>
                <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#829078]">{accountPage ? 'Your account' : 'Ittadi customer care'}</p>
                <h2 className="mt-1 font-serif text-2xl text-[#24352c] sm:text-3xl">
                    {activePanel === 'notifications' ? 'Little updates' : activePanel === 'support' ? 'We are here to help.' : customer ? `Hello, ${customer.name.split(' ')[0]}.` : 'Your Ittadi account'}
                </h2>
              </div>
              {accountPage ? <Link href="/" className="inline-flex items-center gap-2 rounded-full border border-[#e9e6df] px-4 py-2 text-xs font-semibold text-[#315b45] transition hover:bg-[#f5f3ed]"><ArrowLeft size={15} /> Continue shopping</Link> : <button type="button" onClick={() => { setPanel(null); if (checkoutItems) onCloseCheckout(); }} aria-label="Close customer panel" className="rounded-full p-2 text-slate-500 transition hover:bg-[#f5f3ed]"><X size={20} /></button>}
            </header>

            {accountPage && customer && (
              <section className="customer-account-hero glass-panel backdrop-blur-2xl backdrop-saturate-150 grid gap-5 rounded-3xl bg-gradient-to-br from-[#eef2eb] via-[#f7f6f2] to-[#f4eadb] px-5 py-6 sm:grid-cols-[1fr_auto] sm:items-center sm:px-8 sm:py-8">
                <div className="flex min-w-0 items-center gap-4 sm:gap-5">
                  <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-[1.7rem] border-4 border-white bg-[#315b45] text-2xl font-bold text-white shadow-lg sm:h-24 sm:w-24">
                    {profile.avatarUrl ? <img src={profile.avatarUrl} alt={`${customer.name}'s profile`} className="h-full w-full object-cover" /> : <span>{initials}</span>}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#829078]">Welcome to your account</p>
                    <h3 className="mt-1 truncate font-serif text-2xl text-[#24352c] sm:text-3xl">{customer.name}</h3>
                    <p className="mt-1 truncate text-xs text-slate-500">{customer.email}</p>
                    <button type="button" onClick={() => setTab('profile')} className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-[#315b45] hover:text-[#24352c]"><Camera size={14} /> Edit profile &amp; photo</button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 sm:min-w-64">
                  <button type="button" onClick={() => { setTab('orders'); void loadOrders(); }} className="customer-profile-tile backdrop-blur-md rounded-2xl border border-white/80 bg-white/80 px-4 py-3 text-left transition hover:bg-white">
                    <span className="block text-[10px] font-semibold uppercase tracking-wide text-slate-400">Orders</span>
                    <span className="mt-1 block text-xl font-bold text-[#24352c]">{orders.length}</span>
                  </button>
                  <div className="customer-profile-tile backdrop-blur-md rounded-2xl border border-white/80 bg-white/80 px-4 py-3">
                    <span className="block text-[10px] font-semibold uppercase tracking-wide text-slate-400">Account</span>
                    <span className="mt-1 flex items-center gap-1.5 text-sm font-bold text-[#315b45]"><ShieldCheck size={15} /> Active</span>
                  </div>
                </div>
              </section>
            )}

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
                    <>
                      <div className="mb-5">
                        <h3 className="font-serif text-xl text-[#24352c]">Your customer profile</h3>
                        <p className="mt-1 text-xs leading-5 text-slate-500">
                          Save your contact and delivery details here. You can review order updates in My orders.
                        </p>
                      </div>
                      <form onSubmit={saveProfile} className="grid gap-4 sm:grid-cols-2">
                      <div className="flex items-center gap-4 rounded-2xl border border-[#e9e6df] bg-white p-4 sm:col-span-2">
                        <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-[#315b45] text-lg font-bold text-white">
                          {profile.avatarUrl ? <img src={profile.avatarUrl} alt="Profile photo preview" className="h-full w-full object-cover" /> : <span>{initials}</span>}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-bold text-[#24352c]">Profile photo</p>
                          <p className="mt-1 text-[11px] leading-5 text-slate-500">JPG, PNG or WebP. Photos are resized before saving.</p>
                          <div className="mt-2 flex flex-wrap gap-3">
                            <label className="inline-flex cursor-pointer items-center gap-1.5 text-xs font-bold text-[#315b45] hover:text-[#24352c]">
                              <Camera size={14} /> {profile.avatarUrl ? 'Change photo' : 'Upload photo'}
                              <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(event) => void chooseAvatar(event)} />
                            </label>
                            {profile.avatarUrl && <button type="button" onClick={() => setProfile({ ...profile, avatarUrl: '' })} className="text-xs font-semibold text-slate-400 hover:text-rose-600">Remove</button>}
                          </div>
                        </div>
                      </div>
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
                    </>
                  )}

                  {activeTab === 'checkout' && (
                    <form onSubmit={placeOrder} className="space-y-5">
                      <fieldset className="space-y-2">
                        <legend className="mb-2 text-xs font-bold uppercase tracking-[0.12em] text-[#829078]">Payment method</legend>
                        <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-[#e9e6df] bg-white p-4">
                          <input type="radio" name="paymentMethod" value="Cash on delivery" checked={paymentMethod === 'Cash on delivery'} onChange={() => setPaymentMethod('Cash on delivery')} className="mt-1 accent-[#315b45]" />
                          <span><span className="flex items-center gap-2 text-sm font-bold text-[#24352c]"><PackageCheck size={16} className="text-[#58745d]" /> Cash on delivery</span><span className="mt-1 block text-xs text-slate-500">Pay when your order arrives.</span></span>
                        </label>
                        <label className={`flex items-start gap-3 rounded-2xl border border-[#e9e6df] bg-white p-4 ${paymentOptions.sslcommerzEnabled ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'}`}>
                          <input type="radio" name="paymentMethod" value="SSLCOMMERZ" checked={paymentMethod === 'SSLCOMMERZ'} disabled={!paymentOptions.sslcommerzEnabled} onChange={() => setPaymentMethod('SSLCOMMERZ')} className="mt-1 accent-[#315b45]" />
                          <span><span className="block text-sm font-bold text-[#24352c]">Online payment · SSLCOMMERZ</span><span className="mt-1 block text-xs text-slate-500">{paymentOptions.sslcommerzEnabled ? 'Pay securely on the hosted payment page.' : 'Gateway setup is pending; configure merchant credentials to enable.'}</span></span>
                        </label>
                        <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-[#e9e6df] bg-white p-4">
                          <input type="radio" name="paymentMethod" value="Manual bKash" checked={paymentMethod === 'Manual bKash'} onChange={() => setPaymentMethod('Manual bKash')} className="mt-1 accent-[#315b45]" />
                          <span><span className="block text-sm font-bold text-[#24352c]">Manual bKash transfer</span><span className="mt-1 block text-xs text-slate-500">Send the total to {paymentOptions.walletNumbers.bkash}; admin will verify your TxnID.</span></span>
                        </label>
                        <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-[#e9e6df] bg-white p-4">
                          <input type="radio" name="paymentMethod" value="Manual Nagad" checked={paymentMethod === 'Manual Nagad'} onChange={() => setPaymentMethod('Manual Nagad')} className="mt-1 accent-[#315b45]" />
                          <span><span className="block text-sm font-bold text-[#24352c]">Manual Nagad transfer</span><span className="mt-1 block text-xs text-slate-500">Send the total to {paymentOptions.walletNumbers.nagad}; admin will verify your TxnID.</span></span>
                        </label>
                      </fieldset>
                      {paymentMethod.startsWith('Manual ') && (
                        <label className="block text-xs font-semibold text-[#47564b]">Payment transaction ID
                          <input required minLength={4} maxLength={100} pattern="[A-Za-z0-9]+(?:-[A-Za-z0-9]+)*" value={paymentReference} onChange={(event) => setPaymentReference(event.target.value)} className={inputClass} placeholder="Enter the TxnID after sending payment" />
                          <span className="mt-1 block text-[10px] font-normal text-slate-500">Your order stays pending until an admin checks the transfer.</span>
                        </label>
                      )}
                      {checkoutItems && (
                        <section aria-label="Order summary" className="rounded-2xl border border-[#e9e6df] bg-white p-4">
                          <h3 className="text-sm font-bold text-[#24352c]">Order summary</h3>
                          <div className="mt-3 space-y-3">
                            {checkoutItems.map((item) => (
                              <div key={item.productId} className="flex items-center gap-3">
                                <img src={item.image} alt="" className="h-12 w-12 rounded-lg object-cover" />
                                <p className="min-w-0 flex-1 text-xs text-slate-600">
                                  <span className="block truncate font-semibold text-[#24352c]">{item.name}</span>
                                  Qty {item.quantity}
                                </p>
                                <span className="text-xs font-semibold text-[#24352c]">৳ {item.unitPrice * item.quantity}</span>
                              </div>
                            ))}
                          </div>
                            <div className="mt-4 space-y-2 border-t border-[#efede8] pt-3 text-sm">
                              <div className="flex items-center justify-between"><span className="font-semibold text-slate-600">Subtotal</span><strong className="text-[#24352c]">৳ {checkoutSubtotal}</strong></div>
                              <div className="flex items-center justify-between text-xs"><span className="text-slate-500">Delivery</span><span className="font-semibold text-[#24352c]">{checkoutDeliveryFee === null ? 'Enter district' : `৳ ${checkoutDeliveryFee}`}</span></div>
                              {checkoutDeliveryFee !== null && <div className="flex items-center justify-between border-t border-[#efede8] pt-2"><span className="font-bold text-[#24352c]">Order total</span><strong className="text-[#24352c]">৳ {checkoutSubtotal + checkoutDeliveryFee}</strong></div>}
                            </div>
                            <p className="mt-1 text-[10px] text-slate-400">Delivery: ৳70 in Dhaka, ৳120 outside Dhaka.</p>
                        </section>
                      )}
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
                        <ShieldCheck size={17} /> {busy ? 'Submitting…' : paymentMethod === 'SSLCOMMERZ' ? 'Continue to secure payment' : paymentMethod.startsWith('Manual ') ? 'Submit payment for verification' : 'Place cash-on-delivery order'}
                      </button>
                    </form>
                  )}

                  {activeTab === 'orders' && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between gap-3"><p className="text-xs text-slate-500">Track your recent deliveries and status updates.</p><button type="button" onClick={() => void loadOrders()} className="text-[10px] font-bold text-[#58745d]">Refresh</button></div>
                      {orders.length === 0 ? <div className="py-12 text-center"><PackageCheck className="mx-auto text-[#829078]" size={28} /><p className="mt-3 font-serif text-xl text-[#24352c]">No orders just yet.</p><p className="mt-2 text-xs text-slate-500">Your orders will appear here after checkout.</p></div> : orders.map((order) => (
                        <article key={order._id} className="glass-panel backdrop-blur-2xl backdrop-saturate-150 rounded-2xl p-4 sm:p-5">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div><p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#829078]">{order.orderNumber}</p><time className="mt-1 block text-[10px] text-slate-400">{new Date(order.createdAt).toLocaleString()}</time></div>
                            <span className="rounded-full bg-[#eaf0e8] px-3 py-1.5 text-[10px] font-bold text-[#315b45]">{order.status}</span>
                          </div>
                          {(order.currentLocation || order.trackingNote) && (
                            <section aria-label={`Tracking update for order ${order.orderNumber}`} className="mt-4 rounded-2xl border border-[#e9e6df] bg-[#f7f6f2]/70 p-3.5">
                              <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-[#829078]">Live delivery update</p>
                              {order.currentLocation && <p className="mt-1 text-xs font-bold text-[#24352c]">{order.currentLocation}</p>}
                              {order.trackingNote && <p className="mt-1 text-xs leading-5 text-slate-600">{order.trackingNote}</p>}
                            </section>
                          )}
                          <div className="mt-4 space-y-2 border-y border-[#efede8] py-3">
                            {order.items.map((item, index) => <div key={`${item.name}-${index}`} className="flex justify-between gap-3 text-xs"><span className="text-slate-600">{item.name} × {item.quantity}</span><span className="font-semibold text-[#24352c]">৳ {item.unitPrice * item.quantity}</span></div>)}
                          </div>
                          <div className="mt-3 space-y-1 border-t border-[#efede8] pt-3 text-xs">
                            <div className="flex justify-between"><span className="text-slate-500">Subtotal</span><span>৳ {order.subtotal ?? order.total}</span></div>
                            <div className="flex justify-between"><span className="text-slate-500">Delivery</span><span>৳ {order.deliveryFee ?? 0}</span></div>
                            <div className="flex justify-between"><span className="text-slate-500">Payment</span><span>{order.paymentMethod || 'Cash on delivery'} · {order.paymentStatus === 'paid' ? 'Paid' : order.paymentStatus === 'review' ? 'Needs review' : order.paymentStatus === 'failed' ? 'Failed' : order.paymentMethod === 'Cash on delivery' ? 'Pay on delivery' : 'Pending verification'}</span></div>
                            {order.paymentReference && <div className="flex justify-between"><span className="text-slate-500">TxnID</span><span>{order.paymentReference}</span></div>}
                            <div className="flex justify-between pt-1 font-bold"><span>Total</span><span>৳ {order.total}</span></div>
                          </div>
                          <ol className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                            {(order.statusHistory || []).map((entry, index) => <li key={`${entry.status}-${entry.createdAt}-${index}`} className={`rounded-xl px-2.5 py-2 ${index === (order.statusHistory || []).length - 1 ? 'bg-[#eaf0e8] text-[#315b45]' : 'bg-[#f7f6f2] text-slate-500'}`}><p className="text-[10px] font-bold">{entry.status}</p><time className="mt-1 block text-[9px] opacity-70">{new Date(entry.createdAt).toLocaleDateString()}</time>{entry.note && <p className="mt-1 text-[9px] leading-4">{entry.note}</p>}</li>)}
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

export default CustomerHub;

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

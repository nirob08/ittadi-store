'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
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
  LayoutDashboard,
  LogIn,
  LogOut,
  MapPin,
  MessageCircle,
  Package,
  PackageCheck,
  Send,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Wallet,
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
type Tab = 'dashboard' | 'profile' | 'orders' | 'checkout' | 'support';
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
const inputClass =
  'mt-1.5 w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-page)] px-3.5 py-3 text-sm text-[var(--text-primary)] outline-none transition placeholder:text-[var(--text-muted)] focus:border-[#c8ad74] focus:ring-4 focus:ring-[#c8ad74]/15';

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
  const [tab, setTab] = useState<Tab>(accountPage ? 'dashboard' : 'profile');
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
  const [bagCount, setBagCount] = useState(0);
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
  const activeTab: Tab = checkoutItems ? 'checkout' : tab;

  const initials =
    customer?.name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join('')
      .toUpperCase() || 'IT';

  const checkoutSubtotal =
    checkoutItems?.reduce(
      (total, item) => total + item.unitPrice * item.quantity,
      0,
    ) ?? 0;
  const checkoutDeliveryFee = getDeliveryFee(profile.address.district);

  const runningOrdersCount = useMemo(
    () =>
      orders.filter((order) => !['delivered', 'cancelled', 'canceled', 'refunded'].includes(order.status.toLowerCase()))
        .length,
    [orders],
  );

  const totalSpent = useMemo(
    () => orders.reduce((sum, order) => sum + (Number(order.total) || 0), 0),
    [orders],
  );

  useEffect(() => {
    try {
      const savedCart = window.localStorage.getItem('ittadi-cart');
      if (savedCart) {
        const parsed = JSON.parse(savedCart);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          const count = Object.values(parsed).reduce<number>(
            (acc, qty) => acc + (typeof qty === 'number' && qty > 0 ? qty : 0),
            0,
          );
          setBagCount(count);
        }
      }
    } catch {
      // ignore storage issues
    }
  }, [checkoutItems]);

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
      setOrders(result.orders || []);
    } catch (ordersError) {
      setError(ordersError instanceof Error ? ordersError.message : 'Your orders could not be loaded.');
    }
  }, []);

  const loadMessages = useCallback(async () => {
    try {
      const result = await responseJson(await fetch('/api/support/messages', { cache: 'no-store' }));
      setMessages(result.messages || []);
    } catch (messageError) {
      setError(messageError instanceof Error ? messageError.message : 'Support messages could not be loaded.');
    }
  }, []);

  const loadNotifications = useCallback(async () => {
    try {
      const result = await responseJson(await fetch('/api/notifications', { cache: 'no-store' }));
      setNotices(result.notifications || []);
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
                if (active) setOrders(orderResult.orders || []);
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
        if (active) setNotices(result.notifications || []);
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
    if (!customer || (activeTab !== 'orders' && activeTab !== 'support' && activeTab !== 'dashboard')) return undefined;
    let active = true;
    const url = activeTab === 'support' ? '/api/support/messages' : '/api/customer/orders';
    fetch(url, { cache: 'no-store' })
      .then(responseJson)
      .then((result) => {
        if (!active) return;
        if (activeTab === 'support') setMessages(result.messages || []);
        else setOrders(result.orders || []);
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
      if (activePanel === 'account' && (activeTab === 'orders' || activeTab === 'dashboard')) void loadOrders();
    }, 12000);
    return () => window.clearInterval(timer);
  }, [activePanel, activeTab, loadMessages, loadNotifications, loadOrders]);

  const showPanel = useCallback(
    (nextPanel: 'account' | 'notifications' | 'support') => {
      setError('');
      setSuccess('');
      setPanel(nextPanel);
      if (nextPanel === 'support') setTab('support');
      if (nextPanel === 'notifications') void loadNotifications();
      if (nextPanel === 'account') void loadSession();
    },
    [loadNotifications, loadSession],
  );

  const handleAuth = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    setSuccess('');
    try {
      const endpoint = authMode === 'register' ? '/api/auth/register' : '/api/auth/login';
      const result = await responseJson(
        await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(authForm),
        }),
      );
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
      if (!checkoutItems) setTab(accountPage ? 'dashboard' : 'profile');
      void loadOrders();
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
      const result = await responseJson(
        await fetch('/api/customer/profile', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(profile),
        }),
      );
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
        setError(
          locationError.code === locationError.PERMISSION_DENIED
            ? 'Location access was declined. You can enter your delivery address manually.'
            : 'Your location could not be found. Please enter the address manually.',
        );
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
      const result = await responseJson(
        await fetch('/api/customer/orders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            items: checkoutItems.map(({ productId, quantity }) => ({ productId, quantity })),
            deliveryAddress: { ...profile, ...profile.address, location: profile.location },
            paymentMethod,
            paymentReference: paymentMethod.startsWith('Manual ') ? paymentReference.trim() : '',
          }),
        }),
      );
      setPanel('account');
      onCheckoutComplete();
      setOrders((current) => [result.order, ...current]);
      setBagCount(0);
      setTab('orders');
      if (result.paymentUrl) {
        window.location.assign(result.paymentUrl);
        return;
      }
      setPaymentReference('');
      setSuccess(
        paymentMethod.startsWith('Manual ')
          ? `Order ${result.order.orderNumber} received. Payment is pending admin verification.`
          : `Order ${result.order.orderNumber} placed successfully.`,
      );
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
      const result = await responseJson(
        await fetch('/api/support/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text }),
        }),
      );
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
      const subscription =
        existing ||
        (await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: decodeBase64Url(configResponse.publicKey),
        }));
      await responseJson(
        await fetch('/api/push/subscriptions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(subscription.toJSON()),
        }),
      );
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

  const sidebarItems: { id: Tab; label: string; icon: typeof LayoutDashboard }[] = [
    ...(accountPage ? [{ id: 'dashboard' as Tab, label: 'Dashboard', icon: LayoutDashboard }] : []),
    { id: 'orders', label: 'My orders', icon: Package },
    { id: 'profile', label: 'Profile & address', icon: CircleUserRound },
    ...(checkoutItems ? [{ id: 'checkout' as Tab, label: 'Checkout', icon: ShoppingBag }] : []),
    { id: 'support', label: 'Support chat', icon: MessageCircle },
  ];

  return (
    <>
      {!accountPage && (
        <div className="customer-actions fixed bottom-4 right-4 z-40 flex flex-col gap-2.5 sm:bottom-6 sm:right-6">
          <button
            type="button"
            onClick={() => showPanel('notifications')}
            aria-label="Open product notifications"
            className="flex h-11 w-11 items-center justify-center rounded-full border border-[#e5d2ac]/35 bg-[#d49a54] text-white shadow-[0_10px_25px_-6px_rgba(0,0,0,0.45)] transition hover:-translate-y-0.5 hover:bg-[#bd8240]"
          >
            <Bell size={19} />
          </button>
          <button
            type="button"
            onClick={() => showPanel('support')}
            aria-label="Chat with customer support"
            className="flex h-11 w-11 items-center justify-center rounded-full border border-[#e5d2ac]/25 bg-[#315b45] text-white shadow-[0_10px_25px_-6px_rgba(0,0,0,0.45)] transition hover:-translate-y-0.5 hover:bg-[#24352c]"
          >
            <MessageCircle size={19} />
          </button>
          <Link
            href="/account"
            target="_blank"
            rel="noopener noreferrer"
            aria-label={customer ? 'Open customer profile' : 'Sign in or register'}
            className="flex h-11 w-11 items-center justify-center rounded-full border border-[#e5d2ac]/25 bg-[#16261e] text-[#fbf8f1] shadow-[0_10px_25px_-6px_rgba(0,0,0,0.45)] transition hover:-translate-y-0.5 hover:bg-[#24352c]"
          >
            {customer ? <CircleUserRound size={19} /> : <LogIn size={19} />}
          </Link>
        </div>
      )}

      {activePanel && (
        <div
          className={
            accountPage
              ? 'mx-auto w-full max-w-7xl px-4 py-6 sm:px-8 sm:py-8'
              : 'fixed inset-0 z-[70] flex items-end justify-center bg-slate-950/45 p-0 backdrop-blur-sm sm:items-center sm:p-5'
          }
          onMouseDown={
            !accountPage
              ? (event) => {
                  if (event.target === event.currentTarget && !busy) {
                    setPanel(null);
                    if (checkoutItems) onCloseCheckout();
                  }
                }
              : undefined
          }
        >
          <section
            aria-label={
              panel === 'notifications'
                ? 'Product notifications'
                : panel === 'support'
                  ? 'Customer support chat'
                  : 'Customer account'
            }
            aria-modal={accountPage ? undefined : true}
            role={accountPage ? undefined : 'dialog'}
            className={
              accountPage
                ? 'w-full'
                : 'customer-hub-panel glass-panel flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-[2rem] bg-[var(--bg-surface)] shadow-2xl sm:max-h-[88vh] sm:max-w-3xl sm:rounded-[2rem]'
            }
          >
            {/* Top Bar for Modal / Non-logged-in Account */}
            {(!accountPage || !customer) && (
              <header className="flex items-start justify-between gap-4 border-b border-[var(--border-subtle)] px-5 py-4 sm:px-7">
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#c8ad74]">
                    {accountPage ? 'Your account' : 'Ittadi customer care'}
                  </p>
                  <h2 className="mt-1 font-serif text-2xl sm:text-3xl">
                    {activePanel === 'notifications'
                      ? 'Little updates'
                      : activePanel === 'support'
                        ? 'We are here to help.'
                        : customer
                          ? `Hello, ${customer.name.split(' ')[0]}.`
                          : 'Your Ittadi account'}
                  </h2>
                </div>
                {accountPage ? (
                  <Link
                    href="/"
                    className="inline-flex items-center gap-2 rounded-full border border-[var(--border-subtle)] px-4 py-2 text-xs font-semibold transition hover:border-[#c8ad74]"
                  >
                    <ArrowLeft size={15} /> Continue shopping
                  </Link>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setPanel(null);
                      if (checkoutItems) onCloseCheckout();
                    }}
                    aria-label="Close customer panel"
                    className="rounded-full p-2 text-[var(--text-muted)] transition hover:bg-[var(--bg-surface-soft)]"
                  >
                    <X size={20} />
                  </button>
                )}
              </header>
            )}

            {activePanel === 'notifications' ? (
              <>
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border-subtle)] px-5 py-3 sm:px-7">
                  <p className="text-xs text-[var(--text-secondary)]">News and new arrivals from Ittadi.</p>
                  {pushConfigured && (
                    <button
                      type="button"
                      disabled={pushEnabled || noticePermission === 'denied'}
                      onClick={() => void enablePush()}
                      className="inline-flex items-center gap-2 rounded-full bg-[#16261e] px-4 py-2 text-[10px] font-bold text-[#fbf8f1] transition hover:bg-[#243c30] disabled:opacity-50"
                    >
                      <Bell size={13} />{' '}
                      {pushEnabled
                        ? 'Alerts enabled'
                        : noticePermission === 'denied'
                          ? 'Allow in browser settings'
                          : 'Enable browser alerts'}
                    </button>
                  )}
                </div>
                {error && (
                  <p role="alert" className="mx-5 mt-4 rounded-xl bg-rose-500/10 px-4 py-3 text-xs text-rose-600 dark:text-rose-300 sm:mx-7">
                    {error}
                  </p>
                )}
                <div className="flex-1 space-y-3 overflow-y-auto p-5 sm:p-7">
                  {notices.length === 0 ? (
                    <div className="py-12 text-center">
                      <Bell className="mx-auto text-[#c8ad74]" size={28} />
                      <p className="mt-4 font-serif text-xl">No new arrivals just yet.</p>
                      <p className="mt-2 text-xs text-[var(--text-secondary)]">New product announcements will show up here.</p>
                    </div>
                  ) : (
                    notices.map((notice) => (
                      <article
                        key={notice.id}
                        className="flex gap-3 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-page)] p-3.5"
                      >
                        {notice.product?.image && (
                          <img src={notice.product.image} alt="" className="h-14 w-14 shrink-0 rounded-xl object-cover" />
                        )}
                        <div className="min-w-0 flex-1">
                          <h3 className="text-sm font-bold">{notice.title}</h3>
                          <p className="mt-1 text-xs leading-5 text-[var(--text-secondary)]">{notice.message}</p>
                          <time className="mt-2 block text-[10px] text-[var(--text-muted)]">
                            {new Date(notice.createdAt).toLocaleString()}
                          </time>
                        </div>
                      </article>
                    ))
                  )}
                </div>
              </>
            ) : !customer ? (
              <div className="overflow-y-auto p-5 sm:p-8">
                <p className="max-w-lg text-sm leading-6 text-[var(--text-secondary)]">
                  {activePanel === 'support'
                    ? 'Sign in to send a message to our team and continue your conversation any time.'
                    : tab === 'checkout'
                      ? 'Sign in or create a free account to place your order and track delivery.'
                      : 'Sign in to manage your details, see delivery updates and contact our team.'}
                </p>
                {error && (
                  <p role="alert" className="mt-4 rounded-xl bg-rose-500/10 px-4 py-3 text-xs text-rose-600 dark:text-rose-300">
                    {error}
                  </p>
                )}
                {success && (
                  <p role="status" className="mt-4 rounded-xl bg-emerald-500/10 px-4 py-3 text-xs text-emerald-700 dark:text-emerald-300">
                    {success}
                  </p>
                )}
                <a
                  href="/api/auth/google"
                  className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-page)] px-4 py-3 text-sm font-semibold transition hover:border-[#c8ad74]"
                >
                  <GoogleMark /> Continue with Google
                </a>
                <div className="my-5 flex items-center gap-3 text-[10px] text-[var(--text-muted)]">
                  <span className="h-px flex-1 bg-[var(--border-subtle)]" /> OR CONTINUE WITH EMAIL{' '}
                  <span className="h-px flex-1 bg-[var(--border-subtle)]" />
                </div>
                <form onSubmit={handleAuth} className="grid gap-3 sm:grid-cols-2">
                  {authMode === 'register' && (
                    <label className="text-xs font-semibold text-[var(--text-secondary)] sm:col-span-2">
                      Your name
                      <input
                        className={inputClass}
                        required
                        minLength={2}
                        maxLength={120}
                        autoComplete="name"
                        value={authForm.name}
                        onChange={(event) => setAuthForm({ ...authForm, name: event.target.value })}
                        placeholder="Full name"
                      />
                    </label>
                  )}
                  <label className="text-xs font-semibold text-[var(--text-secondary)] sm:col-span-2">
                    Email address
                    <input
                      className={inputClass}
                      type="email"
                      required
                      autoComplete="email"
                      value={authForm.email}
                      onChange={(event) => setAuthForm({ ...authForm, email: event.target.value })}
                      placeholder="you@example.com"
                    />
                  </label>
                  <label className="text-xs font-semibold text-[var(--text-secondary)] sm:col-span-2">
                    Password
                    <input
                      className={inputClass}
                      type="password"
                      required
                      minLength={authMode === 'register' ? 8 : undefined}
                      autoComplete={authMode === 'register' ? 'new-password' : 'current-password'}
                      value={authForm.password}
                      onChange={(event) => setAuthForm({ ...authForm, password: event.target.value })}
                      placeholder={authMode === 'register' ? 'At least 8 characters' : 'Your password'}
                    />
                  </label>
                  <button
                    disabled={busy}
                    type="submit"
                    className="mt-1 rounded-xl bg-[#16261e] px-4 py-3 text-sm font-bold text-[#fbf8f1] transition hover:bg-[#243c30] disabled:opacity-60 sm:col-span-2"
                  >
                    {busy ? 'Please wait…' : authMode === 'register' ? 'Create account' : 'Sign in'}
                  </button>
                </form>
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode(authMode === 'login' ? 'register' : 'login');
                    setError('');
                  }}
                  className="mt-4 w-full text-center text-xs font-semibold text-[#8c6e3b] underline underline-offset-4 dark:text-[#e5d2ac]"
                >
                  {authMode === 'login' ? 'New here? Create an account' : 'Already have an account? Sign in'}
                </button>
              </div>
            ) : accountPage ? (
              /* Full Dashboard Layout (Sidebar + Top Banner + Stat Cards + Content) */
              <div className="grid gap-6 lg:grid-cols-[250px_1fr]">
                {/* Left Sidebar */}
                <aside className="flex flex-col justify-between rounded-3xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4 shadow-sm lg:p-5">
                  <div>
                    <div className="rounded-2xl border border-[#c8ad74]/25 bg-gradient-to-br from-[#122019] via-[#1c3026] to-[#284235] p-4 text-[#fbf8f1]">
                      <div className="flex items-center gap-3">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-[#e5d2ac]/40 bg-[#0d1712] text-sm font-bold text-[#e5d2ac]">
                          {profile.avatarUrl ? (
                            <img src={profile.avatarUrl} alt={customer.name} className="h-full w-full object-cover" />
                          ) : (
                            <span>{initials}</span>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate font-serif text-base font-medium text-white">{customer.name}</p>
                          <p className="truncate text-[11px] text-[#d9c7a6]/85">{customer.email}</p>
                        </div>
                      </div>
                    </div>

                    <nav aria-label="Account sections" className="mt-4 flex gap-1.5 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible lg:pb-0">
                      {sidebarItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = activeTab === item.id;
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => {
                              setTab(item.id);
                              setError('');
                              if (item.id === 'orders' || item.id === 'dashboard') void loadOrders();
                              if (item.id === 'support') void loadMessages();
                            }}
                            className={`flex shrink-0 items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-left text-xs font-semibold transition lg:w-full ${
                              isActive
                                ? 'bg-[#16261e] text-[#fbf8f1] shadow-sm dark:bg-[#d8c39b] dark:text-[#101d17]'
                                : 'text-[var(--text-secondary)] hover:bg-[var(--bg-surface-soft)] hover:text-[var(--text-primary)]'
                            }`}
                          >
                            <Icon size={15} className={isActive ? 'text-[#e5d2ac] dark:text-[#101d17]' : 'text-[#c8ad74]'} />
                            <span>{item.label}</span>
                          </button>
                        );
                      })}
                    </nav>
                  </div>

                  <div className="mt-5 border-t border-[var(--border-subtle)] pt-3">
                    <button
                      type="button"
                      onClick={() => void signOut()}
                      className="flex w-full items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-left text-xs font-semibold text-rose-600 transition hover:bg-rose-500/10 dark:text-rose-400"
                    >
                      <LogOut size={15} />
                      <span>Sign out</span>
                    </button>
                  </div>
                </aside>

                {/* Right Main Workspace */}
                <div className="min-w-0 space-y-6">
                  {/* Top Gradient Banner */}
                  <section className="relative overflow-hidden rounded-3xl border border-[#c8ad74]/25 bg-gradient-to-r from-[#0e1914] via-[#1a2e24] to-[#2a4235] px-6 py-6 text-[#fbf8f1] shadow-md sm:px-8 sm:py-7">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <div>
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-[#e5d2ac]/30 bg-[#e5d2ac]/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-[#e5d2ac]">
                          <Sparkles size={12} /> Member Space
                        </span>
                        <h2 className="mt-2.5 font-serif text-2xl font-normal text-white sm:text-3xl">
                          Hello, {customer.name.split(' ')[0]}.
                        </h2>
                        <p className="mt-1 text-xs text-[#f3efe6]/80 sm:text-sm">
                          Manage your profile, delivery address, and recent orders in one place.
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2.5">
                        <button
                          type="button"
                          onClick={() => setTab('profile')}
                          className="inline-flex items-center gap-1.5 rounded-full border border-[#e5d2ac]/35 bg-white/10 px-4 py-2 text-xs font-semibold text-white transition hover:bg-white/20"
                        >
                          <Camera size={14} /> Edit profile
                        </button>
                        <Link
                          href="/#products"
                          className="inline-flex items-center gap-1.5 rounded-full bg-[#d8c39b] px-4 py-2 text-xs font-bold text-[#101d17] transition hover:bg-[#ece0c8]"
                        >
                          Continue shopping
                        </Link>
                      </div>
                    </div>
                  </section>

                  {error && (
                    <p role="alert" className="rounded-2xl bg-rose-500/10 px-4 py-3 text-xs text-rose-600 dark:text-rose-300 sm:text-sm">
                      {error}
                    </p>
                  )}
                  {success && (
                    <p role="status" className="rounded-2xl bg-emerald-500/10 px-4 py-3 text-xs text-emerald-700 dark:text-emerald-300 sm:text-sm">
                      {success}
                    </p>
                  )}

                  {/* Stat Cards Row */}
                  <section aria-label="Account summary" className="grid grid-cols-2 gap-3.5 sm:grid-cols-4 sm:gap-4">
                    <button
                      type="button"
                      onClick={() => {
                        setTab('orders');
                        void loadOrders();
                      }}
                      className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-[#c8ad74]"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-2xl font-bold">{orders.length}</span>
                        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-500/12 text-sky-600 dark:text-sky-300">
                          <Package size={18} />
                        </span>
                      </div>
                      <p className="mt-2 text-xs font-medium text-[var(--text-secondary)]">Total orders</p>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setTab('orders');
                        void loadOrders();
                      }}
                      className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-[#c8ad74]"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-2xl font-bold">{runningOrdersCount}</span>
                        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/12 text-amber-600 dark:text-amber-300">
                          <PackageCheck size={18} />
                        </span>
                      </div>
                      <p className="mt-2 text-xs font-medium text-[var(--text-secondary)]">Running orders</p>
                    </button>

                    <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4 shadow-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-2xl font-bold">৳{totalSpent}</span>
                        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/12 text-emerald-600 dark:text-emerald-300">
                          <Wallet size={18} />
                        </span>
                      </div>
                      <p className="mt-2 text-xs font-medium text-[var(--text-secondary)]">Amount spent</p>
                    </div>

                    <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4 shadow-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-2xl font-bold">{bagCount}</span>
                        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-500/12 text-purple-600 dark:text-purple-300">
                          <ShoppingBag size={18} />
                        </span>
                      </div>
                      <p className="mt-2 text-xs font-medium text-[var(--text-secondary)]">Items in bag</p>
                    </div>
                  </section>

                  {/* Tab Content Card */}
                  <div className="rounded-3xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5 shadow-sm sm:p-7">
                    {activeTab === 'dashboard' && (
                      <div className="space-y-6">
                        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border-subtle)] pb-4">
                          <div>
                            <h3 className="font-serif text-2xl">Recent orders</h3>
                            <p className="mt-0.5 text-xs text-[var(--text-secondary)]">
                              Your latest purchases and live delivery status.
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => setTab('orders')}
                            className="rounded-full border border-[var(--border-subtle)] px-4 py-1.5 text-xs font-semibold transition hover:border-[#c8ad74]"
                          >
                            All orders
                          </button>
                        </div>

                        {orders.length === 0 ? (
                          <div className="rounded-2xl border border-dashed border-[var(--border-subtle)] bg-[var(--bg-page)] py-10 text-center">
                            <PackageCheck className="mx-auto text-[#c8ad74]" size={28} />
                            <p className="mt-3 font-serif text-xl">No orders yet</p>
                            <p className="mt-1 text-xs text-[var(--text-secondary)]">
                              Once you place an order, it will show up right here.
                            </p>
                            <Link
                              href="/#products"
                              className="mt-4 inline-flex rounded-full bg-[#16261e] px-5 py-2.5 text-xs font-bold uppercase tracking-[0.14em] text-[#fbf8f1] transition hover:bg-[#243c30]"
                            >
                              Explore collection
                            </Link>
                          </div>
                        ) : (
                          <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs">
                              <thead>
                                <tr className="border-b border-[var(--border-subtle)] bg-[var(--bg-surface-soft)] text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--text-muted)]">
                                  <th className="rounded-l-xl px-4 py-3">Order ID</th>
                                  <th className="px-4 py-3">Date</th>
                                  <th className="px-4 py-3">Status</th>
                                  <th className="px-4 py-3">Amount</th>
                                  <th className="rounded-r-xl px-4 py-3 text-right">Action</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-[var(--border-subtle)]">
                                {orders.slice(0, 5).map((order) => (
                                  <tr key={order._id} className="hover:bg-[var(--bg-page)]">
                                    <td className="px-4 py-3.5 font-bold">{order.orderNumber}</td>
                                    <td className="px-4 py-3.5 text-[var(--text-secondary)]">
                                      {new Date(order.createdAt).toLocaleDateString()}
                                    </td>
                                    <td className="px-4 py-3.5">
                                      <span className="rounded-full bg-[#c8ad74]/20 px-3 py-1 text-[10px] font-bold text-[#8c6e3b] dark:text-[#e5d2ac]">
                                        {order.status}
                                      </span>
                                    </td>
                                    <td className="px-4 py-3.5 font-bold">৳ {order.total}</td>
                                    <td className="px-4 py-3.5 text-right">
                                      <button
                                        type="button"
                                        onClick={() => setTab('orders')}
                                        className="font-semibold text-[#8c6e3b] underline underline-offset-4 dark:text-[#e5d2ac]"
                                      >
                                        Track
                                      </button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}

                        {/* Saved Address Quick Card */}
                        <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-page)] p-4 sm:p-5">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-[#c8ad74]">
                              <MapPin size={14} /> Default Delivery Address
                            </div>
                            <button
                              type="button"
                              onClick={() => setTab('profile')}
                              className="text-xs font-semibold underline underline-offset-4"
                            >
                              Update address
                            </button>
                          </div>
                          <p className="mt-2 text-xs text-[var(--text-secondary)] sm:text-sm">
                            {[profile.address.street, profile.address.area, profile.address.district, profile.address.postalCode]
                              .filter(Boolean)
                              .join(', ') || 'No delivery address saved yet.'}
                            {profile.phone ? ` · ${profile.phone}` : ''}
                          </p>
                        </div>
                      </div>
                    )}

                    {activeTab === 'profile' && (
                      <>
                        <div className="mb-5">
                          <h3 className="font-serif text-2xl">Your customer profile</h3>
                          <p className="mt-1 text-xs leading-5 text-[var(--text-secondary)]">
                            Save your contact and delivery details here. You can review order updates in My orders.
                          </p>
                        </div>
                        <form onSubmit={saveProfile} className="grid gap-4 sm:grid-cols-2">
                          <div className="flex items-center gap-4 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-page)] p-4 sm:col-span-2">
                            <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-[#16261e] text-lg font-bold text-[#e5d2ac]">
                              {profile.avatarUrl ? (
                                <img src={profile.avatarUrl} alt="Profile photo preview" className="h-full w-full object-cover" />
                              ) : (
                                <span>{initials}</span>
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-bold">Profile photo</p>
                              <p className="mt-1 text-[11px] leading-5 text-[var(--text-secondary)]">
                                JPG, PNG or WebP. Photos are resized before saving.
                              </p>
                              <div className="mt-2 flex flex-wrap gap-3">
                                <label className="inline-flex cursor-pointer items-center gap-1.5 text-xs font-bold text-[#8c6e3b] dark:text-[#e5d2ac]">
                                  <Camera size={14} /> {profile.avatarUrl ? 'Change photo' : 'Upload photo'}
                                  <input
                                    type="file"
                                    accept="image/jpeg,image/png,image/webp"
                                    className="sr-only"
                                    onChange={(event) => void chooseAvatar(event)}
                                  />
                                </label>
                                {profile.avatarUrl && (
                                  <button
                                    type="button"
                                    onClick={() => setProfile({ ...profile, avatarUrl: '' })}
                                    className="text-xs font-semibold text-[var(--text-muted)] hover:text-rose-600"
                                  >
                                    Remove
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                          <label className="text-xs font-semibold text-[var(--text-secondary)]">
                            Full name
                            <input
                              className={inputClass}
                              required
                              minLength={2}
                              maxLength={120}
                              value={profile.name}
                              onChange={(event) => setProfile({ ...profile, name: event.target.value })}
                            />
                          </label>
                          <label className="text-xs font-semibold text-[var(--text-secondary)]">
                            Email
                            <input className={`${inputClass} opacity-75`} readOnly value={customer.email} />
                          </label>
                          <label className="text-xs font-semibold text-[var(--text-secondary)] sm:col-span-2">
                            Phone number
                            <input
                              className={inputClass}
                              type="tel"
                              autoComplete="tel"
                              value={profile.phone}
                              onChange={(event) => setProfile({ ...profile, phone: event.target.value })}
                              placeholder="+880 1XXX-XXXXXX"
                            />
                          </label>
                          <label className="text-xs font-semibold text-[var(--text-secondary)] sm:col-span-2">
                            Street address
                            <input
                              className={inputClass}
                              autoComplete="street-address"
                              value={profile.address.street}
                              onChange={(event) =>
                                setProfile({ ...profile, address: { ...profile.address, street: event.target.value } })
                              }
                              placeholder="House, road and street"
                            />
                          </label>
                          <label className="text-xs font-semibold text-[var(--text-secondary)]">
                            Area / thana
                            <input
                              className={inputClass}
                              autoComplete="address-level3"
                              value={profile.address.area}
                              onChange={(event) =>
                                setProfile({ ...profile, address: { ...profile.address, area: event.target.value } })
                              }
                              placeholder="Mirpur"
                            />
                          </label>
                          <label className="text-xs font-semibold text-[var(--text-secondary)]">
                            District
                            <input
                              className={inputClass}
                              autoComplete="address-level1"
                              value={profile.address.district}
                              onChange={(event) =>
                                setProfile({ ...profile, address: { ...profile.address, district: event.target.value } })
                              }
                              placeholder="Dhaka"
                            />
                          </label>
                          <label className="text-xs font-semibold text-[var(--text-secondary)]">
                            Postcode (optional)
                            <input
                              className={inputClass}
                              autoComplete="postal-code"
                              value={profile.address.postalCode}
                              onChange={(event) =>
                                setProfile({
                                  ...profile,
                                  address: { ...profile.address, postalCode: event.target.value },
                                })
                              }
                              placeholder="1216"
                            />
                          </label>
                          <div className="flex items-end">
                            <button
                              type="button"
                              onClick={captureLocation}
                              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-[var(--border-subtle)] px-3 py-3 text-xs font-semibold transition hover:border-[#c8ad74]"
                            >
                              <Crosshair size={15} /> {profile.location ? 'Update saved location' : 'Use my current location'}
                            </button>
                          </div>
                          {profile.location && (
                            <p className="text-[10px] text-[#8c6e3b] dark:text-[#e5d2ac] sm:col-span-2">
                              Location captured: {profile.location.latitude}, {profile.location.longitude}
                            </p>
                          )}
                          <div className="flex flex-wrap items-center gap-2 sm:col-span-2">
                            <button
                              disabled={busy}
                              type="submit"
                              className="inline-flex items-center gap-2 rounded-xl bg-[#16261e] px-5 py-3 text-xs font-bold text-[#fbf8f1] transition hover:bg-[#243c30] disabled:opacity-60"
                            >
                              <Check size={15} /> Save details
                            </button>
                            <span className="text-[10px] text-[var(--text-muted)]">
                              Location is only shared when you choose to capture it.
                            </span>
                          </div>
                        </form>
                      </>
                    )}

                    {activeTab === 'orders' && (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-xs text-[var(--text-secondary)]">Track your recent deliveries and status updates.</p>
                          <button
                            type="button"
                            onClick={() => void loadOrders()}
                            className="text-xs font-bold text-[#8c6e3b] dark:text-[#e5d2ac]"
                          >
                            Refresh
                          </button>
                        </div>
                        {orders.length === 0 ? (
                          <div className="py-12 text-center">
                            <PackageCheck className="mx-auto text-[#c8ad74]" size={28} />
                            <p className="mt-3 font-serif text-xl">No orders just yet.</p>
                            <p className="mt-2 text-xs text-[var(--text-secondary)]">Your orders will appear here after checkout.</p>
                          </div>
                        ) : (
                          orders.map((order) => (
                            <article
                              key={order._id}
                              className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-page)] p-4 sm:p-5"
                            >
                              <div className="flex flex-wrap items-start justify-between gap-3">
                                <div>
                                  <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#c8ad74]">
                                    {order.orderNumber}
                                  </p>
                                  <time className="mt-1 block text-[10px] text-[var(--text-muted)]">
                                    {new Date(order.createdAt).toLocaleString()}
                                  </time>
                                </div>
                                <span className="rounded-full bg-[#c8ad74]/20 px-3 py-1.5 text-[10px] font-bold text-[#8c6e3b] dark:text-[#e5d2ac]">
                                  {order.status}
                                </span>
                              </div>
                              {(order.currentLocation || order.trackingNote) && (
                                <section
                                  aria-label={`Tracking update for order ${order.orderNumber}`}
                                  className="mt-4 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-3.5"
                                >
                                  <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-[#c8ad74]">
                                    Live delivery update
                                  </p>
                                  {order.currentLocation && (
                                    <p className="mt-1 text-xs font-bold">{order.currentLocation}</p>
                                  )}
                                  {order.trackingNote && (
                                    <p className="mt-1 text-xs leading-5 text-[var(--text-secondary)]">{order.trackingNote}</p>
                                  )}
                                </section>
                              )}
                              <div className="mt-4 space-y-2 border-y border-[var(--border-subtle)] py-3">
                                {order.items.map((item, index) => (
                                  <div key={`${item.name}-${index}`} className="flex justify-between gap-3 text-xs">
                                    <span className="text-[var(--text-secondary)]">
                                      {item.name} × {item.quantity}
                                    </span>
                                    <span className="font-semibold">
                                      ৳ {item.unitPrice * item.quantity}
                                    </span>
                                  </div>
                                ))}
                              </div>
                              <div className="mt-3 space-y-1 text-xs">
                                <div className="flex justify-between">
                                  <span className="text-[var(--text-secondary)]">Subtotal</span>
                                  <span>৳ {order.subtotal ?? order.total}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-[var(--text-secondary)]">Delivery</span>
                                  <span>৳ {order.deliveryFee ?? 0}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-[var(--text-secondary)]">Payment</span>
                                  <span>
                                    {order.paymentMethod || 'Cash on delivery'} ·{' '}
                                    {order.paymentStatus === 'paid'
                                      ? 'Paid'
                                      : order.paymentStatus === 'review'
                                        ? 'Needs review'
                                        : order.paymentStatus === 'failed'
                                          ? 'Failed'
                                          : order.paymentMethod === 'Cash on delivery'
                                            ? 'Pay on delivery'
                                            : 'Pending verification'}
                                  </span>
                                </div>
                                {order.paymentReference && (
                                  <div className="flex justify-between">
                                    <span className="text-[var(--text-secondary)]">TxnID</span>
                                    <span>{order.paymentReference}</span>
                                  </div>
                                )}
                                <div className="flex justify-between pt-1 font-bold">
                                  <span>Total</span>
                                  <span>৳ {order.total}</span>
                                </div>
                              </div>
                            </article>
                          ))
                        )}
                      </div>
                    )}

                    {activeTab === 'support' && (
                      <div className="flex min-h-[360px] flex-col">
                        <p className="mb-4 text-xs leading-5 text-[var(--text-secondary)]">
                          Send our team a message. Replies will appear here while you are signed in.
                        </p>
                        <div className="flex-1 space-y-3 overflow-y-auto rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-page)] p-4">
                          {messages.length === 0 ? (
                            <p className="py-12 text-center text-xs text-[var(--text-muted)]">
                              No messages yet. How can we help?
                            </p>
                          ) : (
                            messages.map((message) => (
                              <div
                                key={message._id}
                                className={`flex ${message.sender === 'customer' ? 'justify-end' : 'justify-start'}`}
                              >
                                <div
                                  className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 ${
                                    message.sender === 'customer'
                                      ? 'rounded-br-md bg-[#16261e] text-[#fbf8f1]'
                                      : 'rounded-bl-md bg-[var(--bg-surface)] text-[var(--text-primary)]'
                                  }`}
                                >
                                  <p className="whitespace-pre-wrap text-xs leading-5">{message.text}</p>
                                  <time className="mt-1 block text-[9px] opacity-65">
                                    {new Date(message.createdAt).toLocaleString()}
                                  </time>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                        <form onSubmit={sendMessage} className="mt-3 flex items-end gap-2">
                          <textarea
                            aria-label="Your support message"
                            rows={2}
                            maxLength={2000}
                            required
                            value={messageDraft}
                            onChange={(event) => setMessageDraft(event.target.value)}
                            className="w-full resize-none rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-page)] px-3.5 py-3 text-sm outline-none focus:border-[#c8ad74]"
                            placeholder="Write a message…"
                          />
                          <button
                            type="submit"
                            disabled={busy || !messageDraft.trim()}
                            aria-label="Send message"
                            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#16261e] text-[#fbf8f1] transition hover:bg-[#243c30] disabled:opacity-50"
                          >
                            <Send size={17} />
                          </button>
                        </form>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              /* Modal / Checkout View */
              <>
                <nav
                  aria-label="Customer account tabs"
                  className="flex gap-1 overflow-x-auto border-b border-[var(--border-subtle)] bg-[var(--bg-surface)] px-4 py-2 sm:px-7"
                >
                  {(
                    [
                      ['profile', 'Profile'],
                      ['orders', 'My orders'],
                      ['checkout', 'Checkout'],
                      ['support', 'Support'],
                    ] as [Tab, string][]
                  )
                    .filter(([item]) => item !== 'checkout' || Boolean(checkoutItems))
                    .map(([item, label]) => (
                      <button
                        key={item}
                        type="button"
                        onClick={() => {
                          setTab(item);
                          setError('');
                          if (item === 'orders') void loadOrders();
                          if (item === 'support') void loadMessages();
                        }}
                        className={`shrink-0 rounded-full px-3.5 py-2 text-xs font-semibold transition ${
                          tab === item
                            ? 'bg-[#16261e] text-[#fbf8f1]'
                            : 'text-[var(--text-secondary)] hover:bg-[var(--bg-surface-soft)]'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  <button
                    type="button"
                    onClick={() => void signOut()}
                    className="ml-auto shrink-0 rounded-full px-3 py-2 text-xs font-semibold text-[var(--text-muted)] hover:text-rose-600"
                  >
                    Sign out
                  </button>
                </nav>

                {error && (
                  <p role="alert" className="mx-5 mt-4 rounded-xl bg-rose-500/10 px-4 py-3 text-xs text-rose-600 dark:text-rose-300 sm:mx-7">
                    {error}
                  </p>
                )}
                {success && (
                  <p role="status" className="mx-5 mt-4 rounded-xl bg-emerald-500/10 px-4 py-3 text-xs text-emerald-700 dark:text-emerald-300 sm:mx-7">
                    {success}
                  </p>
                )}

                <div className="min-h-0 flex-1 overflow-y-auto p-5 sm:p-7">
                  {activeTab === 'checkout' && (
                    <form onSubmit={placeOrder} className="space-y-5">
                      <fieldset className="space-y-2">
                        <legend className="mb-2 text-xs font-bold uppercase tracking-[0.12em] text-[#c8ad74]">
                          Payment method
                        </legend>
                        <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-page)] p-4">
                          <input
                            type="radio"
                            name="paymentMethod"
                            value="Cash on delivery"
                            checked={paymentMethod === 'Cash on delivery'}
                            onChange={() => setPaymentMethod('Cash on delivery')}
                            className="mt-1 accent-[#16261e]"
                          />
                          <span>
                            <span className="flex items-center gap-2 text-sm font-bold">
                              <PackageCheck size={16} className="text-[#c8ad74]" /> Cash on delivery
                            </span>
                            <span className="mt-1 block text-xs text-[var(--text-secondary)]">Pay when your order arrives.</span>
                          </span>
                        </label>
                        <label
                          className={`flex items-start gap-3 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-page)] p-4 ${
                            paymentOptions.sslcommerzEnabled ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'
                          }`}
                        >
                          <input
                            type="radio"
                            name="paymentMethod"
                            value="SSLCOMMERZ"
                            checked={paymentMethod === 'SSLCOMMERZ'}
                            disabled={!paymentOptions.sslcommerzEnabled}
                            onChange={() => setPaymentMethod('SSLCOMMERZ')}
                            className="mt-1 accent-[#16261e]"
                          />
                          <span>
                            <span className="block text-sm font-bold">Online payment · SSLCOMMERZ</span>
                            <span className="mt-1 block text-xs text-[var(--text-secondary)]">
                              {paymentOptions.sslcommerzEnabled
                                ? 'Pay securely on the hosted payment page.'
                                : 'Gateway setup is pending; configure merchant credentials to enable.'}
                            </span>
                          </span>
                        </label>
                        <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-page)] p-4">
                          <input
                            type="radio"
                            name="paymentMethod"
                            value="Manual bKash"
                            checked={paymentMethod === 'Manual bKash'}
                            onChange={() => setPaymentMethod('Manual bKash')}
                            className="mt-1 accent-[#16261e]"
                          />
                          <span>
                            <span className="block text-sm font-bold">Manual bKash transfer</span>
                            <span className="mt-1 block text-xs text-[var(--text-secondary)]">
                              Send the total to {paymentOptions.walletNumbers.bkash}; admin will verify your TxnID.
                            </span>
                          </span>
                        </label>
                        <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-page)] p-4">
                          <input
                            type="radio"
                            name="paymentMethod"
                            value="Manual Nagad"
                            checked={paymentMethod === 'Manual Nagad'}
                            onChange={() => setPaymentMethod('Manual Nagad')}
                            className="mt-1 accent-[#16261e]"
                          />
                          <span>
                            <span className="block text-sm font-bold">Manual Nagad transfer</span>
                            <span className="mt-1 block text-xs text-[var(--text-secondary)]">
                              Send the total to {paymentOptions.walletNumbers.nagad}; admin will verify your TxnID.
                            </span>
                          </span>
                        </label>
                      </fieldset>
                      {paymentMethod.startsWith('Manual ') && (
                        <label className="block text-xs font-semibold text-[var(--text-secondary)]">
                          Payment transaction ID
                          <input
                            required
                            minLength={4}
                            maxLength={100}
                            pattern="[A-Za-z0-9]+(?:-[A-Za-z0-9]+)*"
                            value={paymentReference}
                            onChange={(event) => setPaymentReference(event.target.value)}
                            className={inputClass}
                            placeholder="Enter the TxnID after sending payment"
                          />
                        </label>
                      )}
                      {checkoutItems && (
                        <section aria-label="Order summary" className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-page)] p-4">
                          <h3 className="text-sm font-bold">Order summary</h3>
                          <div className="mt-3 space-y-3">
                            {checkoutItems.map((item) => (
                              <div key={item.productId} className="flex items-center gap-3">
                                <img src={item.image} alt="" className="h-12 w-12 rounded-lg object-cover" />
                                <p className="min-w-0 flex-1 text-xs text-[var(--text-secondary)]">
                                  <span className="block truncate font-semibold text-[var(--text-primary)]">{item.name}</span>
                                  Qty {item.quantity}
                                </p>
                                <span className="text-xs font-semibold">
                                  ৳ {item.unitPrice * item.quantity}
                                </span>
                              </div>
                            ))}
                          </div>
                          <div className="mt-4 space-y-2 border-t border-[var(--border-subtle)] pt-3 text-sm">
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-[var(--text-secondary)]">Subtotal</span>
                              <strong>৳ {checkoutSubtotal}</strong>
                            </div>
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-[var(--text-muted)]">Delivery</span>
                              <span className="font-semibold">
                                {checkoutDeliveryFee === null ? 'Enter district' : `৳ ${checkoutDeliveryFee}`}
                              </span>
                            </div>
                            {checkoutDeliveryFee !== null && (
                              <div className="flex items-center justify-between border-t border-[var(--border-subtle)] pt-2">
                                <span className="font-bold">Order total</span>
                                <strong>৳ {checkoutSubtotal + checkoutDeliveryFee}</strong>
                              </div>
                            )}
                          </div>
                        </section>
                      )}
                      <div className="grid gap-3 sm:grid-cols-2">
                        <label className="text-xs font-semibold text-[var(--text-secondary)]">
                          Recipient name
                          <input
                            className={inputClass}
                            required
                            minLength={2}
                            value={profile.name}
                            onChange={(event) => setProfile({ ...profile, name: event.target.value })}
                          />
                        </label>
                        <label className="text-xs font-semibold text-[var(--text-secondary)]">
                          Phone number
                          <input
                            className={inputClass}
                            required
                            type="tel"
                            value={profile.phone}
                            onChange={(event) => setProfile({ ...profile, phone: event.target.value })}
                            placeholder="+880 1XXX-XXXXXX"
                          />
                        </label>
                        <label className="text-xs font-semibold text-[var(--text-secondary)] sm:col-span-2">
                          Delivery address
                          <input
                            className={inputClass}
                            required
                            value={profile.address.street}
                            onChange={(event) =>
                              setProfile({ ...profile, address: { ...profile.address, street: event.target.value } })
                            }
                            placeholder="House, road and street"
                          />
                        </label>
                        <label className="text-xs font-semibold text-[var(--text-secondary)]">
                          Area / thana
                          <input
                            className={inputClass}
                            required
                            value={profile.address.area}
                            onChange={(event) =>
                              setProfile({ ...profile, address: { ...profile.address, area: event.target.value } })
                            }
                            placeholder="Mirpur"
                          />
                        </label>
                        <label className="text-xs font-semibold text-[var(--text-secondary)]">
                          District
                          <input
                            className={inputClass}
                            required
                            value={profile.address.district}
                            onChange={(event) =>
                              setProfile({ ...profile, address: { ...profile.address, district: event.target.value } })
                            }
                            placeholder="Dhaka"
                          />
                        </label>
                      </div>
                      <button
                        type="submit"
                        disabled={busy}
                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#16261e] px-5 py-3.5 text-sm font-bold text-[#fbf8f1] transition hover:bg-[#243c30] disabled:opacity-60"
                      >
                        <ShieldCheck size={17} />{' '}
                        {busy ? 'Submitting…' : 'Place order'}
                      </button>
                    </form>
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
  const padding = '='.repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = window.atob(base64);
  return Uint8Array.from(raw, (character) => character.charCodeAt(0));
}

function GoogleMark() {
  return (
    <svg aria-hidden="true" viewBox="0 0 48 48" className="h-4 w-4">
      <path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5Z"
        transform="translate(0 5)"
      />
      <path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.74 7.18l7.66 5.94c4.47-4.13 7.12-10.2 7.12-17.59Z"
        transform="translate(0 -1)"
      />
      <path
        fill="#FBBC05"
        d="M10.53 28.59a14.48 14.48 0 0 1 0-9.18l-7.98-6.19a23.99 23.99 0 0 0 0 21.56l7.98-6.19Z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.9-5.8l-7.66-5.94c-2.13 1.43-4.84 2.28-8.24 2.28-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48Z"
      />
    </svg>
  );
}
import webPush from 'web-push';
import PushSubscription from '@/models/PushSubscription';

let vapidConfigured = false;

function isKnownPushService(hostname) {
  return (
    hostname === 'fcm.googleapis.com' ||
    hostname === 'push.services.mozilla.com' ||
    hostname.endsWith('.push.services.mozilla.com') ||
    hostname.endsWith('.push.apple.com') ||
    hostname.endsWith('.notify.windows.com')
  );
}

function configureWebPush() {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;
  if (!publicKey || !privateKey || !subject) return false;
  if (!vapidConfigured) {
    webPush.setVapidDetails(subject, publicKey, privateKey);
    vapidConfigured = true;
  }
  return true;
}

export async function announceNewProduct(product) {
  if (!configureWebPush()) return { configured: false, sent: 0, failed: 0 };

  const subscriptions = await PushSubscription.find({}).lean();
  const validSubscriptions = subscriptions.filter((subscription) => {
    try {
      return isKnownPushService(new URL(subscription.endpoint).hostname);
    } catch {
      return false;
    }
  });
  const payload = JSON.stringify({
    title: `New at Ittadi: ${product.name}`,
    body: `Discover ${product.name} for ৳ ${product.price}.`,
    url: '/#products',
  });
  const results = await Promise.allSettled(
    validSubscriptions.map((subscription) =>
      webPush.sendNotification(
        { endpoint: subscription.endpoint, keys: subscription.keys },
        payload,
        { TTL: 60 * 60 * 24 },
      ),
    ),
  );

  let sent = 0;
  let failed = 0;
  for (let index = 0; index < results.length; index += 1) {
    const result = results[index];
    if (result.status === 'fulfilled') {
      sent += 1;
      continue;
    }

    failed += 1;
    const statusCode = result.reason?.statusCode;
    if (statusCode === 404 || statusCode === 410) {
      await PushSubscription.deleteOne({ _id: validSubscriptions[index]._id });
    } else {
      console.error('Product push notification failed:', statusCode || result.reason?.message || 'Unknown push delivery error');
    }
  }
  return { configured: true, sent, failed };
}

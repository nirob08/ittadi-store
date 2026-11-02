self.addEventListener('push', (event) => {
  let notification = {
    title: 'Something new at Ittadi',
    body: 'Discover the latest addition to our collection.',
    url: '/#products',
  };
  if (event.data) {
    try {
      notification = { ...notification, ...event.data.json() };
    } catch {
      notification.body = event.data.text();
    }
  }
  event.waitUntil(
    self.registration.showNotification(notification.title, {
      body: notification.body,
      icon: '/android-chrome-192x192.png',
      badge: '/favicon-32x32.png',
      data: { url: notification.url },
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = new URL(event.notification.data?.url || '/#products', self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      const existing = clients.find((client) => client.url.startsWith(self.location.origin));
      if (existing) {
        existing.navigate(target);
        return existing.focus();
      }
      return self.clients.openWindow(target);
    }),
  );
});

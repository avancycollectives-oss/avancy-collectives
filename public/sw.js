self.addEventListener('push', event => {
  let data = {};

  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = {
      title: 'AVANCY COLLECTIVES',
      body: 'You have a new notification.'
    };
  }

  const title = data.title || 'AVANCY COLLECTIVES';

  const options = {
    body: data.body || '',
    tag: data.tag || 'avancy-notification',
    renotify: true,
    requireInteraction: false,
    data: {
      url: data.url || '/admin/orders'
    }
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();

  const targetUrl =
    event.notification?.data?.url ||
    '/admin/orders';

  event.waitUntil(
    (async () => {
      const absoluteUrl = new URL(
        targetUrl,
        self.location.origin
      ).href;

      const clients = await self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true
      });

      for (const client of clients) {
        if ('focus' in client) {
          try {
            await client.navigate(absoluteUrl);
          } catch {}
          await client.focus();
          return;
        }
      }

      if (self.clients.openWindow) {
        await self.clients.openWindow(absoluteUrl);
      }
    })()
  );
});

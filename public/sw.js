// Kunjikkulam Juma Masjid Mahallu Management Portal - Service Worker
const CACHE_NAME = 'mahal-pwa-v2';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => {
        return Promise.all(
          keys.map((key) => {
            if (key !== CACHE_NAME) {
              return caches.delete(key);
            }
          })
        );
      })
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  // Only handle standard GET requests
  if (event.request.method !== 'GET') return;

  // For navigation requests, try network first, fallback to offline gracefully
  event.respondWith(
    fetch(event.request).catch(() => {
      return caches.match(event.request).then((res) => {
        return res || caches.match('/');
      });
    })
  );
});

// ==========================================
// Web Push Notifications Handling
// ==========================================

self.addEventListener('push', function (event) {
  if (!event.data) return;

  try {
    const data = event.data.json();
    const title = data.title || 'Kunjikkulam Juma Masjid';
    const options = {
      body: data.body || '',
      icon: data.icon || '/icon-192x192.png',
      badge: data.badge || '/icon-192x192.png',
      vibrate: [200, 100, 200, 100, 200],
      tag: data.tag || 'mahallu-notification',
      renotify: true,
      data: {
        url: data.url || '/',
        dateOfArrival: Date.now(),
      },
      actions: data.actions || [],
    };

    event.waitUntil(self.registration.showNotification(title, options));
  } catch (err) {
    console.error('[SW] Error parsing push payload:', err);
    // Fallback if data is plain text
    try {
      const text = event.data.text();
      event.waitUntil(
        self.registration.showNotification('Kunjikkulam Juma Masjid', {
          body: text,
          icon: '/icon-192x192.png',
          badge: '/icon-192x192.png',
        })
      );
    } catch (e) {
      console.error('[SW] Push display failure:', e);
    }
  }
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();

  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((windowClients) => {
        // If an existing tab with this URL is already open, focus it
        for (let client of windowClients) {
          if (client.url === targetUrl && 'focus' in client) {
            return client.focus();
          }
        }
        // If any window of our app is open, navigate and focus
        if (windowClients.length > 0 && 'navigate' in windowClients[0]) {
          return windowClients[0].navigate(targetUrl).then((c) => c.focus());
        }
        // Otherwise open a new window
        if (clients.openWindow) {
          return clients.openWindow(targetUrl);
        }
      })
  );
});

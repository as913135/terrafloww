/**
 * TerraFlow - Service Worker for Background Device Notifications
 * Handles push notifications and background alerts even when Chrome is closed, minimized, or in background.
 */

const CACHE_NAME = 'terraflow-v2-cache';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/css/styles.css',
  '/assets/terraflow_logo.svg'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE).catch(() => {});
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Listen for background message events from app
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SHOW_BACKGROUND_NOTIFICATION') {
    const { title, options } = event.data;
    self.registration.showNotification(title, {
      icon: 'assets/terraflow_logo.svg',
      badge: 'assets/terraflow_logo.svg',
      vibrate: [300, 100, 300, 100, 400],
      requireInteraction: true,
      ...options
    });
  }
});

// Listen for push events from server Web Push API
self.addEventListener('push', (event) => {
  let data = {
    title: '🚨 TerraFlow Incident Alert',
    body: 'A critical pipeline anomaly was detected on the national grid.',
    url: '/index.html'
  };

  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: 'assets/terraflow_logo.svg',
    badge: 'assets/terraflow_logo.svg',
    vibrate: [300, 100, 300, 100, 400],
    requireInteraction: true,
    data: { url: data.url || '/index.html' }
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Notification click event: focus or open browser window
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const urlToOpen = (event.notification.data && event.notification.data.url) || '/index.html';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (let client of windowClients) {
        if (client.url.includes('index.html') && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

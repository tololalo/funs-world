/**
 * FunS Wallet Service Worker
 * Provides offline support and caching for PWA
 */
const CACHE_NAME = 'funs-wallet-v1';
const STATIC_ASSETS = [
  './',
  './index.html',
  './js/config.js',
  './js/wallet-core.js',
  './js/wallet-blockchain.js',
  './js/wallet-transactions.js',
  './js/wallet-ui.js',
  '../../funs-nugi.png'
];

// Install: cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

// Fetch: network-first strategy for API calls, cache-first for static assets
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Network-first for API calls and blockchain RPC
  if (url.hostname.includes('api') ||
      url.hostname.includes('dataseed') ||
      url.hostname.includes('llamarpc') ||
      url.hostname.includes('coingecko')) {
    event.respondWith(
      fetch(event.request)
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // Cache-first for static assets
  event.respondWith(
    caches.match(event.request).then((cached) => {
      return cached || fetch(event.request).then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      });
    })
  );
});

/**
 * Service Worker for FunS Wallet PWA
 * Provides offline support by caching essential assets
 */

const CACHE_NAME = 'funs-wallet-v45';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/funs-nugi.png',
  './icons/splash.png',
  './icons/bnb.svg',
  './icons/btc.svg',
  './icons/usdt.svg',
  './icons/usdc.svg',
  './icons/cake.svg',
  './icons/eth.svg',
  './icons/funs.svg',
  './js/config.js',
  './js/native-bridge.js',
  './js/i18n.js',
  './js/wallet-core.js',
  './js/wallet-blockchain.js',
  './js/wallet-transactions.js',
  './js/wallet-ui.js',
  './legal/terms-of-service.html',
  './legal/privacy-policy.html',
];

// Install event - cache files
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE).catch(() => Promise.resolve());
    })
  );
  // Force the new service worker to take over
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  // Claim all clients
  self.clients.claim();
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip external requests (different origin)
  if (!request.url.startsWith(self.location.origin)) {
    return;
  }

  // Network-first strategy: always try network, fallback to cache
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (!response || response.status !== 200) {
          // Bad network response, try cache
          return caches.match(request).then(cached => cached || response);
        }
        // Cache the fresh response (non-blocking but errors are suppressed)
        const responseToCache = response.clone();
        event.waitUntil(
          caches.open(CACHE_NAME).then((cache) => cache.put(request, responseToCache)).catch(() => {})
        );
        return response;
      })
      .catch(() => {
        // Network failed, serve from cache
        return caches.match(request).then((cachedResponse) => {
          if (cachedResponse) return cachedResponse;
          const offlineHtml = `<!DOCTYPE html><html lang="ko"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0,viewport-fit=cover"><title>FunS Wallet — Offline</title><style>body{margin:0;background:#070A12;color:#fff;font-family:-apple-system,BlinkMacSystemFont,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;text-align:center;padding:20px;box-sizing:border-box}.icon{font-size:64px;margin-bottom:16px}h1{font-size:22px;margin:0 0 8px}p{color:rgba(255,255,255,0.55);font-size:14px;line-height:1.6;margin:0 0 24px}button{background:#FF6B35;color:#fff;border:none;border-radius:12px;padding:12px 28px;font-size:15px;font-weight:600;cursor:pointer}</style></head><body><div><div class="icon">📡</div><h1>오프라인 상태입니다</h1><p>인터넷 연결을 확인하고 다시 시도해주세요.<br>지갑 데이터는 안전하게 보관되어 있습니다.</p><button onclick="location.reload()">다시 시도</button></div></body></html>`;
          return new Response(offlineHtml, {
            status: 503,
            statusText: 'Service Unavailable',
            headers: new Headers({ 'Content-Type': 'text/html; charset=utf-8' })
          });
        });
      })
  );
});

// Handle messages from clients
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data && event.data.type === 'CLIENTS_CLAIM') {
    self.clients.claim();
  }
});

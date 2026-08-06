// Service Worker — HanaPOS CMS (PWA, offline cache)
const CACHE = 'omnipos-hana-v3';
const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './favicon.png',
  './html5-qrcode.min.js',
];

self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS).catch(() => {})));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    Promise.all([
      caches.keys().then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
      ),
      self.clients.claim()
    ])
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;

  // 🔑 JANGAN cache API Supabase — selalu fresh!
  if (req.url.includes('/rest/') || req.url.includes('/auth/') || req.url.includes('/functions/')) {
    return;
  }

  // Network-first untuk HTML
  if (req.mode === 'navigate' || req.destination === 'document') {
    e.respondWith(
      fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy));
        return res;
      }).catch(() => caches.match(req).then((r) => r || caches.match('./index.html')))
    );
    return;
  }

  // Cache-first untuk aset lokal
  e.respondWith(
    caches.match(req).then((cached) =>
      cached || fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy));
        return res;
      }).catch(() => cached)
    )
  );
});

/* ============================================================
   EduCache — sw.js  (Service Worker)
   Caches all app shell files so the UI works offline.
   Uploaded files live in IndexedDB — not the cache.
   ============================================================ */

const CACHE = 'educache-v2';

const SHELL = [
  './',
  './index.html',
  './login.html',
  './home.html',
  './admin.html',
  './css/login.css',
  './css/home.css',
  './css/admin.css',
  './js/db.js',
  './js/login.js',
  './js/home.js',
  './js/admin.js',
  './manifest.json',
  './icons/icon-192.svg',
  './icons/icon-512.svg',
  'https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:ital,wght@0,300;0,400;0,500;1,300&display=swap',
];

// Install — cache app shell
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())
  );
});

// Activate — clear old caches
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Fetch — cache-first for shell, pass-through for everything else
self.addEventListener('fetch', e => {
  if (e.request.url.startsWith('chrome-extension')) return;
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(res => {
        if (res && res.status === 200 && res.type === 'basic') {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return res;
      }).catch(() => {
        if (e.request.mode === 'navigate') return caches.match('./login.html');
      });
    })
  );
});

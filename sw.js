/* ============================================================
   EduCache — sw.js  (Service Worker)
   Caches all app shell files so the UI works offline.
   Uploaded files live in IndexedDB — not the cache.
   ============================================================ */

const CACHE = 'educache-v1';

const SHELL = [
  './final-year-project-400l/',
  './final-year-project-400l/login.html',
  './final-year-project-400l/login.css',
  './final-year-project-400l/login.js',
  './final-year-project-400l/home.html',
  './final-year-project-400l/home.css',
  './final-year-project-400l/home.js',
  './final-year-project-400l/admin.html',
  './final-year-project-400l/admin.css',
  './final-year-project-400l/admin.js',
  './final-year-project-400l/db.js',
  './final-year-project-400l/manifest.json',
  './final-year-project-400l/icons/icon-192.svg',
  './final-year-project-400l/icons/icon-512.svg',
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

// Fetch — cache-first for shell, network-first for Google Fonts
self.addEventListener('fetch', e => {
  if (e.request.url.startsWith('chrome-extension')) return;
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(res => {
        // Cache valid same-origin responses
        if (res && res.status === 200 && res.type === 'basic') {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return res;
      }).catch(() => {
        // Offline fallback for navigation
        if (e.request.mode === 'navigate') return caches.match('./final-year-project-400l/login.html');
      });
    })
  );
});

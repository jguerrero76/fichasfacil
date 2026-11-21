const CACHE_NAME = 'fichasfacil-v128';
const APP_SHELL = [
  './',
  './index.html',
  './worksheet-preview-frame.html',
  './404.html',
  './styles.css?v=20261121-9',
  './app.js?v=20261121-18',
  './manifest.webmanifest',
  './favicon.svg?v=20261011-17',
  './pwa-icon.svg?v=20261011-17'
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  const preloadReady = self.registration.navigationPreload ? self.registration.navigationPreload.enable() : Promise.resolve();
  event.waitUntil(preloadReady
    .then(() => caches.keys())
    .then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const requestUrl = new URL(event.request.url);
  if (requestUrl.origin !== self.location.origin) return;
  event.respondWith((async () => {
    const isStaticAsset = /\.(?:css|js|svg|png|ico|webmanifest)$/i.test(requestUrl.pathname);
    if (isStaticAsset) {
      const cached = await caches.match(event.request);
      if (cached) return cached;
      try {
        const response = await fetch(event.request);
        if (response && response.status === 200 && response.type !== 'opaque') {
          event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.put(event.request, response.clone())));
        }
        return response;
      } catch (error) {
        return Response.error();
      }
    }
    try {
      const preload = await event.preloadResponse;
      const response = preload || await fetch(event.request, { cache: 'no-store' });
      if (response && response.status === 200 && response.type !== 'opaque' && !requestUrl.search) {
        const copy = response.clone();
        event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy)));
      }
      return response;
    } catch (error) {
      const cached = await caches.match(event.request);
      return cached || (event.request.mode === 'navigate' ? caches.match('./index.html') : Response.error());
    }
  })());
});

const CACHE_NAME = 'fichasfacil-v98';
const APP_SHELL = [
  './',
  './index.html',
  './404.html',
  './styles.css?v=20261012-95',
  './blog.html',
  './guia.html',
  './sumas.html',
  './restas.html',
  './multiplicaciones.html',
  './divisiones.html',
  './problemas-matematicos.html',
  './comprension-lectora.html',
  './caligrafia.html',
  './geometria.html',
  './fracciones.html',
  './aviso-legal.html',
  './privacidad.html',
  './cookies.html',
  './app.js?v=20261012-98',
  './assets/jspdf.umd.min.js?v=20261012-1',
  './manifest.webmanifest',
  './favicon.svg?v=20261011-17',
  './pwa-icon.svg?v=20261011-17',
  './portada-fichas-reales.svg?v=20261011-1',
  './portada-fichas-reales-v2.svg?v=20261011-3',
  './blog.html',
  './guia.html',
  './llms.txt'
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const requestUrl = new URL(event.request.url);
  if (requestUrl.origin !== self.location.origin) return;
  event.respondWith((async () => {
    try {
      const response = await fetch(event.request, { cache: 'no-store' });
      if (response && response.status === 200 && response.type !== 'opaque') {
        const copy = response.clone();
        event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy)));
      }
      return response;
    } catch (error) {
      const cached = await caches.match(event.request);
      return cached || (event.request.mode === 'navigate' ? caches.match('./404.html') : Response.error());
    }
  })());
});

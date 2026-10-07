// B2B Sales LHB: keeps the last copy of the site so the home-screen app opens even with weak or no internet.
// The page: network first (a new version shows at once when online); the saved copy when offline or after 4 s.
// Google (sheets, sign-in, photos) is never touched: those requests go straight to the network.
const CACHE = 'b2b-app-v1';
const HOME = new URL('./', self.location).pathname;

self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(['./', 'icon-192.png', 'apple-touch-icon.png'])));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const r = e.request, u = new URL(r.url);
  if (r.method !== 'GET' || u.origin !== self.location.origin) return;
  const isHome = r.mode === 'navigate' && (u.pathname === HOME || u.pathname === HOME + 'index.html');
  if (isHome) {
    e.respondWith((async () => {
      const cache = await caches.open(CACHE);
      const net = fetch(r).then((res) => { if (res.ok) cache.put('./', res.clone()); return res; });
      try {
        const res = await Promise.race([net, new Promise((ok) => setTimeout(() => ok(null), 4000))]);
        if (res) return res;
      } catch (err) { /* offline */ }
      return (await cache.match('./')) || net;
    })());
    return;
  }
  if (r.mode === 'navigate') return;   // other pages (privacy.html, visit/): normal
  e.respondWith(caches.match(r).then((hit) => hit || fetch(r)));
});

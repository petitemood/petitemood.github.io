/* Petite Mood PWA - cache minima, contenuti sempre aggiornati */
const VERSION = "petite-mood-v1";
const STATIC_CACHE = `${VERSION}-static`;
const ESSENTIALS = [
  "/offline.html",
  "/images/pwa/icon-192.png",
  "/images/pwa/icon-512.png",
  "/images/favicon.svg"
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(STATIC_CACHE).then((cache) => cache.addAll(ESSENTIALS)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== STATIC_CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET" || request.mode !== "navigate") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    fetch(request).catch(async () => {
      const cachedPage = await caches.match("/offline.html");
      return cachedPage || new Response("Petite Mood non è disponibile offline.", {
        status: 503,
        headers: { "Content-Type": "text/plain; charset=utf-8" }
      });
    })
  );
});

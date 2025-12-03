// Optimized Service Worker for Ukiyo QR
const CACHE_NAME = "ukiyo-qr-v2";
const STATIC_CACHE_URLS = [
  "/",
  "/static/css/styles.css",
  "/static/js/app.min.js",
  "/static/img/favicon.png",
  "/manifest.json",
];

const FONT_CACHE_URLS = [
  "https://fonts.googleapis.com/css2?family=Inter:wght@400;600&display=swap",
  "https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hiA.woff2",
];

// Install event - cache static assets
self.addEventListener("install", (event) => {
  event.waitUntil(
    Promise.all([
      caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_CACHE_URLS)),
      caches.open("fonts-cache").then((cache) => cache.addAll(FONT_CACHE_URLS)),
    ]).then(() => self.skipWaiting()),
  );
});

// Activate event - clean up old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              return caches.delete(cacheName);
            }
          }),
        );
      })
      .then(() => {
        return self.clients.claim();
      }),
  );
});

// Fetch event - serve from cache with network fallback
self.addEventListener("fetch", (event) => {
  // Skip non-GET requests
  if (event.request.method !== "GET") {
    return;
  }

  // Skip external requests (except fonts)
  if (
    !event.request.url.startsWith(self.location.origin) &&
    !event.request.url.includes("fonts.googleapis.com") &&
    !event.request.url.includes("fonts.gstatic.com")
  ) {
    return;
  }

  event.respondWith(
    caches
      .match(event.request)
      .then((response) => {
        // Return cached version or fetch from network
        return (
          response ||
          fetch(event.request).then((fetchResponse) => {
            // Don't cache QR images or POST responses
            if (
              event.request.url.includes("/static/qr/") ||
              fetchResponse.status !== 200 ||
              fetchResponse.type !== "basic"
            ) {
              return fetchResponse;
            }

            // Clone the response for caching
            const responseToCache = fetchResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });

            return fetchResponse;
          })
        );
      })
      .catch(() => {
        // Return offline page for navigation requests
        if (event.request.mode === "navigate") {
          return caches.match("/");
        }
      }),
  );
});

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Sisonkhe In Transit — Service Worker
 *
 * Strategy:
 *   - App shell (HTML, JS, CSS, fonts, icons): cache-first with background update
 *   - API GET requests: network-first with cache fallback (up to 5 minutes stale)
 *   - API POST/PATCH/DELETE: network-only (never cached — mutations must be
 *     handled by the client outbox, not the SW)
 *   - Public routes (/kiosk, /verify): network-first, cache fallback
 *   - Offline fallback: /offline page for HTML navigation requests
 *
 * Version bumping: change SW_VERSION to invalidate all caches on deploy.
 */

const SW_VERSION = "v2";
const STATIC_CACHE = `sisonkhe-static-${SW_VERSION}`;
const RUNTIME_CACHE = `sisonkhe-runtime-${SW_VERSION}`;

// Core assets to precache on install
const PRECACHE_URLS = [
  "/",
  "/offline",
  "/kiosk",
  "/login",
  "/claim",
  "/manifest.webmanifest",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/maskable-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      // Best-effort — some URLs may 404 during development
      return Promise.allSettled(
        PRECACHE_URLS.map((url) =>
          cache.add(url).catch((err) => {
            console.warn(`[sw] precache failed for ${url}:`, err.message);
          })
        )
      );
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((key) => key !== STATIC_CACHE && key !== RUNTIME_CACHE)
          .map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Never cache mutations — client outbox handles those
  if (request.method !== "GET") {
    return;
  }

  // Skip cross-origin requests
  if (url.origin !== self.location.origin) {
    return;
  }

  // Skip Next.js dev tooling
  if (url.pathname.startsWith("/_next/webpack") || url.pathname.includes("__nextjs")) {
    return;
  }

  // API requests: network-first with 5-min cache fallback
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(networkFirstWithCache(request, RUNTIME_CACHE, 300));
    return;
  }

  // Static assets: cache-first
  if (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname.match(/\.(js|css|png|jpg|jpeg|svg|woff2?|ttf|ico|webp)$/)
  ) {
    event.respondWith(cacheFirstWithUpdate(request, STATIC_CACHE));
    return;
  }

  // Everything else (pages): network-first, cache fallback
  event.respondWith(networkFirstWithCache(request, RUNTIME_CACHE));
});

// ---------------------------------------------------------------------------
// Strategies
// ---------------------------------------------------------------------------

async function networkFirstWithCache(request, cacheName, maxAgeSeconds) {
  const cache = await caches.open(cacheName);
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cloned = response.clone();
      // Store with a timestamp header
      const headers = new Headers(cloned.headers);
      headers.set("x-sw-cached-at", String(Date.now()));
      const body = await cloned.blob();
      await cache.put(
        request,
        new Response(body, {
          status: cloned.status,
          statusText: cloned.statusText,
          headers,
        })
      );
    }
    return response;
  } catch (err) {
    const cached = await cache.match(request);
    if (cached) {
      if (maxAgeSeconds) {
        const cachedAt = Number(cached.headers.get("x-sw-cached-at") ?? 0);
        const ageSec = (Date.now() - cachedAt) / 1000;
        if (ageSec > maxAgeSeconds) {
          console.warn(`[sw] cache expired for ${request.url} (age: ${ageSec}s)`);
          // Still return the cached response — better than nothing when offline
        }
      }
      return cached;
    }
    // Offline fallback page for navigation requests
    if (request.headers.get("accept")?.includes("text/html")) {
      const offline = await cache.match("/offline");
      if (offline) return offline;
    }
    return new Response("Offline and no cache available", { status: 503 });
  }
}

async function cacheFirstWithUpdate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) {
    // Update in background
    fetch(request)
      .then((response) => {
        if (response.ok) cache.put(request, response.clone());
      })
      .catch(() => {});
    return cached;
  }
  try {
    const response = await fetch(request);
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch (err) {
    return new Response("Offline", { status: 503 });
  }
}

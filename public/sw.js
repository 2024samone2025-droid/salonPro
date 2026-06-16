/* SalonPro service worker — installability + a cached app shell + an offline
   fallback. Deliberately hand-written and dependency-free: it uses runtime
   caching (no build-time precache manifest), so it degrades gracefully and
   never serves a stale hashed chunk.

   Strategies:
   - Navigations (HTML): network-first → fall back to the cached page, then to
     the precached /offline page when truly offline.
   - Static assets (/_next/static, /icons, fonts): cache-first (these are
     content-hashed, so cached === fresh).
   - Everything else (APIs, etc.): passes straight through to the network. */

const VERSION = 'v1'
const SHELL_CACHE = `salonpro-shell-${VERSION}`
const RUNTIME_CACHE = `salonpro-runtime-${VERSION}`
const OFFLINE_URL = '/offline'

const PRECACHE = [OFFLINE_URL, '/icons/icon-192.png']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) => cache.addAll(PRECACHE)).then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k !== SHELL_CACHE && k !== RUNTIME_CACHE)
            .map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  )
})

function isStaticAsset(url) {
  return (
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.startsWith('/icons/') ||
    /\.(?:woff2?|ttf|otf|png|jpg|jpeg|svg|webp|ico)$/.test(url.pathname)
  )
}

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return

  // Navigations → network-first, offline fallback.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone()
          caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, copy))
          return response
        })
        .catch(async () => {
          const cached = await caches.match(request)
          return cached || caches.match(OFFLINE_URL)
        }),
    )
    return
  }

  // Static, content-hashed assets → cache-first.
  if (isStaticAsset(url)) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((response) => {
            const copy = response.clone()
            caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, copy))
            return response
          }),
      ),
    )
  }
  // Other GETs (APIs, etc.) are left to the network.
})

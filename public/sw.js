// Offline support. The page is fetched network-first so online users always
// get the latest version; everything else (hashed build files, icons) is
// served from the cache first. URLs are relative to this file, so the app
// works under any base path (e.g. GitHub Pages).
//
// The develop build is served from a sub-path of main (…/develop/) with its
// own worker, so each worker keeps a cache named after its scope and only
// caches its own page.
const CACHE_VERSION = 'dart-counter-v2'
const CACHE = `${CACHE_VERSION} ${self.registration.scope}`
/** The cache of the workers from before scoped caches. */
const LEGACY_CACHE = 'dart-counter-v1'
const SHELL = './'
const SHELL_PATH = new URL(SHELL, location.href).pathname

/**
 * Caches the page and every file it links to, and drops cached files the
 * page no longer links to (build files from older deploys).
 */
async function syncCache(page) {
  const cache = await caches.open(CACHE)
  const html = await page.clone().text()
  const linked = new Set(
    [...html.matchAll(/(?:src|href)="([^"]+)"/g)]
      .map((match) => new URL(match[1], page.url))
      .filter((url) => url.origin === location.origin)
      .map(String),
  )
  await cache.put(SHELL, page)
  await cache.addAll([...linked])
  const shell = new URL(SHELL, location.href).href
  for (const request of await cache.keys()) {
    if (request.url !== shell && !linked.has(request.url)) await cache.delete(request)
  }
}

self.addEventListener('install', (event) => {
  self.skipWaiting()
  event.waitUntil(fetch(SHELL, { cache: 'no-cache' }).then(syncCache))
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      for (const key of await caches.keys()) {
        const ownOld = key.endsWith(` ${self.registration.scope}`) && key !== CACHE
        if (ownOld || key === LEGACY_CACHE) await caches.delete(key)
      }
      await self.clients.claim()
    })(),
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET' || new URL(request.url).origin !== location.origin) return

  if (request.mode === 'navigate') {
    // A page outside this app, like the develop build under main: left to the network.
    if (new URL(request.url).pathname !== SHELL_PATH) return
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) event.waitUntil(syncCache(response.clone()).catch(() => {}))
          return response
        })
        .catch(async () => (await caches.match(SHELL)) ?? Response.error()),
    )
    return
  }

  event.respondWith(
    caches.match(request).then((cached) => cached ?? fetch(request)),
  )
})

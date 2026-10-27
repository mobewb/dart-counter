// Offline support. The page is fetched network-first so online users always
// get the latest version; everything else (hashed build files, icons) is
// served from the cache first. URLs are relative to this file, so the app
// works under any base path (e.g. GitHub Pages).
const CACHE = 'dart-counter-v1'
const SHELL = './'

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
      for (const key of await caches.keys()) if (key !== CACHE) await caches.delete(key)
      await self.clients.claim()
    })(),
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET' || new URL(request.url).origin !== location.origin) return

  if (request.mode === 'navigate') {
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

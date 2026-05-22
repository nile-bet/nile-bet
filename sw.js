// NILE Bet Service Worker v1.0
const CACHE_NAME = 'nilebet-v1'
const STATIC_CACHE = 'nilebet-static-v1'
const DYNAMIC_CACHE = 'nilebet-dynamic-v1'

// Assets to cache on install
const STATIC_ASSETS = [
  '/',
  '/weekend-jackpot',
  '/check-slip',
  '/login',
  '/rules',
  '/offline',
  '/manifest.json',
]

// ─── INSTALL ──────────────────────────
self.addEventListener('install', (event) => {
  console.log('[SW] Installing...')
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => {
        console.log('[SW] Caching static assets')
        return cache.addAll(
          STATIC_ASSETS.map((url) =>
            new Request(url, {
              cache: 'reload',
            })
          )
        ).catch((err) => {
          console.warn(
            '[SW] Some assets failed to cache:',
            err
          )
        })
      })
      .then(() =>
        self.skipWaiting()
      )
  )
})

// ─── ACTIVATE ─────────────────────────
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating...')
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter(
              (key) =>
                key !== STATIC_CACHE &&
                key !== DYNAMIC_CACHE
            )
            .map((key) => {
              console.log(
                '[SW] Deleting old cache:',
                key
              )
              return caches.delete(key)
            })
        )
      )
      .then(() =>
        self.clients.claim()
      )
  )
})

// ─── FETCH ────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Skip non-GET, cross-origin, Supabase,
  // and API requests
  if (
    request.method !== 'GET' ||
    url.origin !== self.location.origin ||
    url.pathname.startsWith('/api/') ||
    url.hostname.includes('supabase') ||
    url.hostname.includes('anthropic') ||
    url.pathname.includes('_next/data')
  ) {
    return
  }

  // For navigation requests:
  // Network first → cache → offline page
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone()
            caches
              .open(DYNAMIC_CACHE)
              .then((cache) =>
                cache.put(request, clone)
              )
          }
          return response
        })
        .catch(() =>
          caches
            .match(request)
            .then(
              (cached) =>
                cached ||
                caches.match('/offline') ||
                new Response(
                  offlineFallbackHTML(),
                  {
                    headers: {
                      'Content-Type':
                        'text/html',
                    },
                  }
                )
            )
        )
    )
    return
  }

  // For static assets (_next/static):
  // Cache first → network
  if (
    url.pathname.startsWith('/_next/static')
  ) {
    event.respondWith(
      caches
        .match(request)
        .then(
          (cached) =>
            cached ||
            fetch(request).then((response) => {
              if (response.ok) {
                const clone = response.clone()
                caches
                  .open(STATIC_CACHE)
                  .then((cache) =>
                    cache.put(
                      request,
                      clone
                    )
                  )
              }
              return response
            })
        )
    )
    return
  }

  // For images: Cache first → network
  if (
    request.destination === 'image' ||
    url.pathname.match(
      /\.(png|jpg|jpeg|svg|ico|webp)$/
    )
  ) {
    event.respondWith(
      caches
        .match(request)
        .then(
          (cached) =>
            cached ||
            fetch(request).then((response) => {
              if (response.ok) {
                const clone = response.clone()
                caches
                  .open(DYNAMIC_CACHE)
                  .then((cache) =>
                    cache.put(
                      request,
                      clone
                    )
                  )
              }
              return response
            })
        )
    )
    return
  }
})

// ─── PUSH NOTIFICATIONS ───────────────
self.addEventListener('push', (event) => {
  if (!event.data) return

  let payload
  try {
    payload = event.data.json()
  } catch {
    payload = {
      title: 'NILE Bet',
      body: event.data.text(),
    }
  }

  const options = {
    body: payload.body,
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    vibrate: [200, 100, 200],
    data: payload.data ?? {},
    actions: payload.actions ?? [],
    tag: payload.tag ?? 'nilebet-notif',
    renotify: true,
  }

  event.waitUntil(
    self.registration.showNotification(
      payload.title ?? 'NILE Bet',
      options
    )
  )
})

// ─── NOTIFICATION CLICK ───────────────
self.addEventListener(
  'notificationclick',
  (event) => {
    event.notification.close()

    const url =
      event.notification.data?.url ?? '/'

    event.waitUntil(
      clients
        .matchAll({
          type: 'window',
          includeUncontrolled: true,
        })
        .then((clientList) => {
          for (const client of clientList) {
            if (
              client.url === url &&
              'focus' in client
            ) {
              return client.focus()
            }
          }
          if (clients.openWindow) {
            return clients.openWindow(url)
          }
        })
    )
  }
)

// ─── BACKGROUND SYNC ──────────────────
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-pending-bets') {
    console.log('[SW] Background sync triggered')
    // The actual sync happens in the app
    // via the OfflineStore
  }
})

// ─── OFFLINE FALLBACK HTML ────────────
function offlineFallbackHTML() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>NILE Bet — Offline</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      background: #1A1A2E;
      color: #F0F0F0;
      font-family: -apple-system, BlinkMacSystemFont, sans-serif;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      text-align: center;
      padding: 24px;
    }
    .logo { font-size: 48px; font-weight: 900; color: #C9A84C; letter-spacing: 4px; margin-bottom: 8px; }
    .tagline { font-size: 14px; color: rgba(255,255,255,0.4); margin-bottom: 48px; }
    .icon { font-size: 64px; margin-bottom: 24px; }
    h1 { font-size: 24px; font-weight: 700; margin-bottom: 12px; }
    p { color: rgba(255,255,255,0.5); font-size: 15px; line-height: 1.6; max-width: 320px; margin-bottom: 32px; }
    button {
      background: #C9A84C;
      color: #1A1A2E;
      border: none;
      padding: 14px 32px;
      border-radius: 12px;
      font-size: 15px;
      font-weight: 700;
      cursor: pointer;
    }
  </style>
</head>
<body>
  <div class="logo">NILE</div>
  <div class="tagline">Flow into Wins</div>
  <div class="icon">📡</div>
  <h1>You're Offline</h1>
  <p>Check your connection and try again. Your pending bets will sync automatically when you're back online.</p>
  <button onclick="window.location.reload()">Try Again</button>
</body>
</html>`
}
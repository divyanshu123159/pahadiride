// ==========================================
// PahadiRide Service Worker
// ==========================================
const CACHE_NAME = 'pahadiride-v2';
const STATIC_ASSETS = [
    '/index.html',
    '/search.html',
    '/signin.html',
    '/signup.html',
    '/help.html',
    '/dashboard.html',
    '/style.css',
    '/script.js',
    '/manifest.json',
    '/bolero_png.jpeg',
    '/icon-192.png',
    '/icon-512.png',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css'
];

// Install: cache all static files
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(STATIC_ASSETS))
            .then(() => self.skipWaiting())
    );
});

// Activate: remove old caches
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys =>
            Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
        ).then(() => self.clients.claim())
    );
});

// Fetch: cache-first for static assets, network-first for API
self.addEventListener('fetch', event => {
    const url = event.request.url;

    // Always go to network for Google Apps Script API calls
    if (url.includes('script.google.com')) {
        event.respondWith(
            fetch(event.request).catch(() =>
                new Response(JSON.stringify([]), { headers: { 'Content-Type': 'application/json' } })
            )
        );
        return;
    }

    // Cache-first for everything else
    event.respondWith(
        caches.match(event.request).then(cached => {
            if (cached) return cached;
            return fetch(event.request).then(response => {
                // Cache valid responses
                if (response && response.status === 200 && response.type === 'basic') {
                    const cloned = response.clone();
                    caches.open(CACHE_NAME).then(cache => cache.put(event.request, cloned));
                }
                return response;
            }).catch(() => {
                // Offline fallback for HTML pages
                if (event.request.headers.get('accept').includes('text/html')) {
                    return caches.match('/index.html');
                }
            });
        })
    );
});
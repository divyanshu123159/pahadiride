// sw.js
self.addEventListener('install', (e) => {
    console.log('[Service Worker] Installed');
});

self.addEventListener('fetch', (e) => {
    // This satisfies the browser's requirement for a fetch handler
    e.respondWith(fetch(e.request).catch(() => console.log("Network error")));
});

import { build, files, version } from '$service-worker';

// Create a unique cache name based on the current deployment version
const CACHE_NAME = `rxindex-cache-${version}`;

// Combine the compiled app files and static assets into one array
const ASSETS = [
  ...build,
  ...files
];

// 1. INSTALL EVENT: Cache all application shell files
self.addEventListener('install', (event) => {
    async function addFilesToCache() {
        const cache = await caches.open(CACHE_NAME);
        await cache.addAll(ASSETS);
    }
    event.waitUntil(addFilesToCache());
    // Force the waiting service worker to become the active service worker
    self.skipWaiting();
});

// 2. ACTIVATE EVENT: Clean up any old caches from previous versions
self.addEventListener('activate', (event) => {
    async function deleteOldCaches() {
        for (const key of await caches.keys()) {
            if (key !== CACHE_NAME) {
                await caches.delete(key);
            }
        }
    }
    event.waitUntil(deleteOldCaches());
    self.clients.claim();
});

// 3. FETCH EVENT: Intercept requests and serve from cache if offline
self.addEventListener('fetch', (event) => {
    // Only intercept GET requests
    if (event.request.method !== 'GET') return;

    async function respond() {
        const url = new URL(event.request.url);
        const cache = await caches.open(CACHE_NAME);

        // If the requested URL is in our known ASSETS, serve it directly from the cache
        if (ASSETS.includes(url.pathname)) {
            return cache.match(url.pathname);
        }

        // For all other requests (like page navigations), try the network first.
        // If the network fails (offline), fall back to the cache.
        try {
            const response = await fetch(event.request);
            if (response.status === 200) {
                cache.put(event.request, response.clone());
            }
            return response;
        } catch {
            return cache.match(event.request);
        }
    }

    event.respondWith(respond());
});

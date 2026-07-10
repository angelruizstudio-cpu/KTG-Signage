const CACHE_VERSION = 'ktg-media-v1';
const CACHE_NAME = CACHE_VERSION;
const MEDIA_PATH = '/storage/v1/object/public/signage-media/';
const MAX_ENTRIES = 50;

function isMediaRequest(request) {
  return request.method === 'GET' && new URL(request.url).pathname.includes(MEDIA_PATH);
}

async function trimCache(cache) {
  const keys = await cache.keys();
  while (keys.length > MAX_ENTRIES) {
    await cache.delete(keys.shift());
  }
}

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter((name) => name.startsWith('ktg-media-') && name !== CACHE_NAME).map((name) => caches.delete(name)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  if (!isMediaRequest(event.request)) return;

  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(event.request);
    const network = fetch(event.request).then(async (response) => {
      if (response && response.ok) {
        await cache.put(event.request, response.clone());
        await trimCache(cache);
      }
      return response;
    }).catch(() => null);

    return cached || (await network) || Response.error();
  })());
});

// KTG Signage is PWA-ready. Advanced offline media caching will be added after device pairing.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

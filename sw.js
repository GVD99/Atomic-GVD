/* Atomic GVD — service worker: funcționare offline */
const VER = "agvd-v4";
const SHELL = ["./", "./index.html", "./app.js", "./manifest.webmanifest", "./icon-192.png", "./icon-512.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(VER).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== VER).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});
/* network-first pentru shell (ca actualizările să ajungă), cache-first pentru fonturi */
self.addEventListener("fetch", e => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET") return;
  if (url.origin === location.origin) {
    e.respondWith(
      fetch(e.request).then(r => {
        const cp = r.clone(); caches.open(VER).then(c => c.put(e.request, cp)); return r;
      }).catch(() => caches.match(e.request, { ignoreSearch: true }).then(r => r || caches.match("./index.html")))
    );
  } else if (url.host.includes("fonts.g")) {
    e.respondWith(
      caches.match(e.request).then(r => r || fetch(e.request).then(rr => {
        const cp = rr.clone(); caches.open(VER).then(c => c.put(e.request, cp)); return rr;
      }))
    );
  }
});
self.addEventListener("notificationclick", e => {
  e.notification.close();
  e.waitUntil(clients.matchAll({ type: "window" }).then(ws => {
    for (const w of ws) { if ("focus" in w) return w.focus(); }
    return clients.openWindow("./");
  }));
});

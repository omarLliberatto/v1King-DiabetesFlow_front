const CACHE = "diabetesflow-v1";
const SCOPE = new URL(self.registration.scope).pathname;
const PAGES = ["", "food/", "glucose/", "activities/", "settings/"].map((p) => SCOPE + p);

async function precache() {
  const cache = await caches.open(CACHE);
  const assets = new Set([SCOPE + "manifest.webmanifest", SCOPE + "icon-192.png", SCOPE + "apple-touch-icon.png"]);
  for (const page of PAGES) {
    const res = await fetch(page, { cache: "no-store" });
    if (!res.ok) continue;
    const html = await res.clone().text();
    await cache.put(page, res);
    for (const m of html.matchAll(/(?:src|href)="([^"]*\/_next\/static\/[^"]+)"/g)) assets.add(m[1]);
  }
  await Promise.all([...assets].map((a) => cache.add(a).catch(() => undefined)));
}

self.addEventListener("install", (event) => {
  event.waitUntil(precache().then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== self.location.origin || !url.pathname.startsWith(SCOPE)) return;

  if (url.pathname.includes("/_next/static/")) {
    event.respondWith(
      caches.match(req).then(
        (hit) =>
          hit ||
          fetch(req).then((res) => {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
            return res;
          }),
      ),
    );
    return;
  }

  event.respondWith(
    fetch(req)
      .then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
        }
        return res;
      })
      .catch(() =>
        caches
          .match(req, { ignoreSearch: true })
          .then((hit) => hit || (req.mode === "navigate" ? caches.match(SCOPE) : undefined))
          .then((hit) => hit || new Response("Sin conexión", { status: 503 })),
      ),
  );
});

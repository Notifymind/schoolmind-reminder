const CACHE_NAME = "notifymind-shell-v3";

// Some connection drops leave fetch pending instead of rejecting promptly.
async function fetchWithTimeout(request) {
  const controller = new AbortController();
  let timer;
  try {
    return await Promise.race([
      fetch(request, { signal: controller.signal }),
      new Promise((_, reject) => {
        timer = setTimeout(() => {
          reject(new Error("Network timeout"));
          controller.abort();
        }, 5_000);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}

async function cacheShell() {
  const cache = await caches.open(CACHE_NAME);
  const response = await fetch("/offline", { cache: "reload" });
  if (!response.ok) throw new Error("Could not download offline app");
  const html = await response.clone().text();
  const assets = [...new Set(html.match(/\/_next\/static\/[^\s"'<>\\]+\.(?:js|css|woff2?)/g) || [])];
  await Promise.all(assets.map(async (asset) => {
    const result = await fetch(asset, { cache: "reload" });
    if (!result.ok) throw new Error("Could not download " + asset);
    await cache.put(asset, result.clone());
    if (asset.endsWith(".css")) {
      const css = await result.text();
      const fonts = [...css.matchAll(/url\(["']?([^\)"']+)["']?\)/g)];
      await Promise.all(fonts.map(async ([, path]) => {
        const url = new URL(path, new URL(asset, self.location.origin));
        if (url.origin === self.location.origin) await cache.add(url.href);
      }));
    }
  }));
  // Publish the shell only once its scripts, styles, and fonts are available.
  await cache.put("/offline", response);
}
self.addEventListener("install", (event) => {
  event.waitUntil(cacheShell().then(() => self.skipWaiting()));
});
self.addEventListener("message", (event) => {
  if (event.data?.type === "CACHE_SHELL") event.waitUntil(cacheShell());
});
self.addEventListener("activate", (event) => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith("notifymind-") && key !== CACHE_NAME).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== "GET" || url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      const cached = await cache.match(event.request);
      if (cached) return cached;
      const response = await fetch(event.request);
      if (response.ok) await cache.put(event.request, response.clone());
      return response;
    })());
  } else if (event.request.mode === "navigate" && (url.pathname === "/app" || url.pathname.startsWith("/app/") || url.pathname === "/offline")) {
    event.respondWith((async () => {
      try {
        const response = await fetchWithTimeout(event.request);
        if (response.status < 500) return response;
      } catch { /* Render the local app when the network is unavailable. */ }
      return (await caches.match("/offline")) || new Response("Connect once to download the offline app.", { status: 503, headers: { "Content-Type": "text/plain" } });
    })());
  } else if ((url.pathname === "/app" || url.pathname.startsWith("/app/")) &&
    (event.request.headers?.get("RSC") === "1" || url.searchParams.has("_rsc"))) {
    // RSC cannot consume an HTML shell. Fail promptly so Next can perform a
    // document navigation, which uses the cached shell above.
    event.respondWith(fetchWithTimeout(event.request).catch(async () => {
      const client = await self.clients.get(event.clientId);
      client?.postMessage({ type: "NETWORK_UNAVAILABLE" });
      return Response.error();
    }));
  }
  // Auth responses, private HTML, RSC payloads, and server actions are never cached.
});

self.addEventListener("push", function (event) {
  if (event.data) {
    const data = event.data.json();
    const options = {
      body: data.body,
      tag: data.tag,
      icon: data.icon || "/android-chrome-192x192.png",
      badge: "/android-chrome-192x192.png",
      vibrate: [100, 50, 100],
      data: {
        dateOfArrival: Date.now(),
        primaryKey: "2",
      },
    };
    event.waitUntil(self.registration.showNotification(data.title, options));
  }
});

self.addEventListener("notificationclick", function (event) {
  console.log("Notification click received.");
  event.notification.close();
  event.waitUntil(clients.openWindow("/app"));
});

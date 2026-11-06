// Service worker « Outils cuisine » : toujours la dernière version des fichiers du site.
// Stratégie « réseau d'abord » : chaque fichier du site est revalidé auprès de GitHub Pages
// (requête conditionnelle, très légère) ; la copie locale ne sert qu'en cas de coupure réseau.
// Firebase, Google Fonts, etc. (autres domaines) ne passent pas par ici.
const CACHE = "outils-cuisine";

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

self.addEventListener("fetch", (e) => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== self.location.origin) return;
  if (url.pathname.endsWith("/version.json")) return; // toujours le réseau, jamais de copie

  e.respondWith((async () => {
    const fresh = new Request(url.href, { cache: "no-cache", credentials: "same-origin" });
    try {
      const res = await fetch(fresh);
      if (res.ok && res.type === "basic") {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(url.href, copy));
      }
      return res;
    } catch (err) {
      const cached = await caches.match(url.href) || (req.mode === "navigate" ? await caches.match(new URL("./", self.location).href) : null);
      if (cached) return cached;
      throw err;
    }
  })());
});

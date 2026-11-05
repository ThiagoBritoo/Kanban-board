// Service worker "rede primeiro": sempre tenta a versão nova; o cache só serve se estiver sem internet.
// Só mexe em arquivos do próprio site (nunca em chamadas ao Supabase).
const CACHE = 'kanban-v39';
// guarda a "casca" do app na instalação para ele abrir mesmo sem rede (os dados do quadro continuam precisando de internet)
const SHELL = ['./', 'index.html', 'app.css', 'themes.css', 'boot.js', 'config.js', 'backend.js', 'app.js', 'views.js', 'palette.js', 'touch.js', 'polish.js', 'fx.js', 'shader.js', 'terrain.js', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png'];
self.addEventListener('install', (e) => { e.waitUntil(caches.open(CACHE).then((c) => Promise.all(SHELL.map((u) => c.add(u).catch(() => {})))).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const r = e.request;
  if (r.method !== 'GET' || new URL(r.url).origin !== location.origin) return;
  e.respondWith(
    fetch(r).then((res) => { if (res.ok) { const c = res.clone(); caches.open(CACHE).then((ca) => ca.put(r, c)); } return res; })
      .catch(() => caches.match(r).then((m) => m || caches.match('./'))));
});

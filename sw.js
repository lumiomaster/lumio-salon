/* LUMIO SALON - Service Worker (3. teslim)
   Uygulama kabuğu önbelleğe alınır; veri HER ZAMAN internetten gelir (Pro internetle çalışır).
   Her teslimde CACHE sürümünü artırın ki yeni dosyalar hemen gelsin. */
const CACHE = 'lumio-salon-v1-t3';
const KABUK = [
  './', './index.html', './manifest.json', './css/app.css',
  './js/main.js', './js/config.js', './js/i18n.js', './js/util.js', './js/durum.js', './js/fb.js', './js/roller.js',
  './js/ekranlar/giris.js', './js/ekranlar/ana.js', './js/ekranlar/ekip.js', './js/ekranlar/ayarlar.js', './js/veri.js', './js/ekranlar/salon.js', './js/ekranlar/genel.js', './js/ekranlar/hizmetler.js', './js/ekranlar/ustalar.js', './js/ekranlar/takvim.js', './js/takvim-mantik.js',
  './icons/logo.png', './icons/icon-192.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(KABUK).catch(() => {})).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  const r = e.request;
  if (r.method !== 'GET') return;
  const url = new URL(r.url);
  if (url.origin !== self.location.origin) return;       // Firebase ve diğer dış istekler olduğu gibi gider
  e.respondWith(
    fetch(r).then(res => {
      if (res && res.status === 200) { const kopya = res.clone(); caches.open(CACHE).then(c => c.put(r, kopya)).catch(() => {}); }
      return res;
    }).catch(() => caches.match(r).then(m => m || (r.mode === 'navigate' ? caches.match('./index.html') : undefined)))
  );
});

/* LUMIO SALON - Service Worker (8. teslim)
   Uygulama kabuğu önbelleğe alınır; veri HER ZAMAN internetten gelir (Pro internetle çalışır).
   Her teslimde CACHE sürümünü artırın ki yeni dosyalar hemen gelsin. */
const CACHE = 'lumio-salon-v1-t17k';
const KABUK = [
  './', './index.html', './manifest.json', './css/app.css',
  './js/main.js', './js/ikonlar.js', './js/config.js', './js/i18n.js', './js/util.js', './js/durum.js', './js/fb.js', './js/roller.js',
  './js/ekranlar/giris.js', './js/ekranlar/ana.js', './js/ekranlar/ekip.js', './js/ekranlar/ayarlar.js', './js/veri.js', './js/ekranlar/salon.js', './js/ekranlar/genel.js', './js/ekranlar/hizmetler.js', './js/ekranlar/ustalar.js', './js/ekranlar/takvim.js', './js/ekranlar/kasa.js', './js/ekranlar/musteriler.js', './js/ekranlar/hesap.js', './js/ekranlar/kazancim.js', './js/ekranlar/odeme-formu.js', './js/kasa-mantik.js', './js/takvim-mantik.js', './js/mesaj.js', './js/geri.js', './js/gecmis.js', './js/ekranlar/islem.js', './js/ekranlar/ilave.js', './js/ekranlar/mutabakat-kart.js', './js/ekranlar/kalem-detay.js', './js/mesaj-kayit.js', './js/ekranlar/duzeltme.js', './js/ekranlar/sohbet.js', './js/ekranlar/stok.js', './js/stok-mantik.js', './js/stok-yaz.js', './js/kar-mantik.js', './js/ekranlar/kar.js', './js/ekranlar/sablonlar.js', './js/ekranlar/yarin-kart.js', './js/hukuk.js', './js/sunucu.js', './js/ekranlar/danisman.js', './js/sss.js', './js/sss-yapi.js', './js/sss-tr.js', './js/sss-ru.js', './js/sss-kk.js', './js/sss-de.js', './js/sss-en.js', './js/ekranlar/sss.js', './js/oran-ayar.js', './js/hedef-mantik.js', './js/tesvik.js', './js/sadakat-mantik.js', './js/tema.js', './js/arama.js', './js/destek.js', './js/disa-aktar-mantik.js', './js/analiz-mantik.js', './js/analiz-resim.js', './js/ekranlar/analiz.js', './js/ekranlar/satis-urunler.js', './js/sadakat-ayar.js', './js/ekranlar/hedef-kart.js', './js/ekranlar/yonetici.js', './js/ulke.js', './js/ekranlar/ulke-sec.js', './js/ekranlar/dil-sec.js', './js/diller/ru.js', './js/diller/kk.js', './js/diller/de.js', './js/diller/en.js',
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

// ---- Web bildirimi (Worker'dan gelir) ----
self.addEventListener('push', (e) => {
  let v = {};
  try { v = e.data ? e.data.json() : {}; } catch (err) { v = { baslik: 'LUMIO SALON', govde: e.data ? e.data.text() : '' }; }
  e.waitUntil(self.registration.showNotification(v.baslik || 'LUMIO SALON', {
    body: v.govde || '', icon: './icons/icon-192.png', badge: './icons/icon-192.png', tag: v.etiket || undefined, renotify: !!v.etiket, data: { git: v.git || '' }
  }));
});
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const git = (e.notification.data && e.notification.data.git) || '';
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
    for (const c of list) {
      if ('focus' in c) { if (git) c.postMessage({ tur: 'git', git }); return c.focus(); }
    }
    return self.clients.openWindow(git ? './?git=' + encodeURIComponent(git) : './');
  }));
});

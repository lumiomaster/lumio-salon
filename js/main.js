import { UYGULAMA } from './config.js';
import { t } from './i18n.js';
import { h, bildir } from './util.js';
import { S } from './durum.js';
import { auth, db, onAuthStateChanged, signOut, doc, getDoc } from './fb.js';
import { sekmelerim } from './roller.js';
import { girisEkrani } from './ekranlar/giris.js';
import { anaEkrani } from './ekranlar/ana.js';
import { ekipEkrani } from './ekranlar/ekip.js';
import { ayarlarEkrani } from './ekranlar/ayarlar.js';
import { salonEkrani } from './ekranlar/salon.js';
import { takvimEkrani } from './ekranlar/takvim.js';
import { kasaEkrani } from './ekranlar/kasa.js';
import { musterilerEkrani } from './ekranlar/musteriler.js';
import { veriSifirla } from './veri.js';
import { ekipYenile } from './ekranlar/ekip.js';
import { geriTusunuBaslat, sekmeDegisti } from './geri.js';
import { sohbetDugmesi, sohbetKontrolBaslat, sohbetKontrolDurdur } from './ekranlar/sohbet.js';

const kok = document.getElementById('uygulama');

export async function oturumuYukle() {
  const u = auth.currentUser;
  if (!u) { S.profil = null; S.salon = null; veriSifirla(); ekipYenile(); sohbetKontrolDurdur(); return goster(); }
  try {
    const ps = await getDoc(doc(db, 'kullanicilar', u.uid));
    if (!ps.exists()) { S.profil = null; S.salon = null; S.mesaj = t('Hesabınız bir salona bağlı değil. Yöneticinizle görüşün.'); return goster(); }
    const p = { id: ps.id, ...ps.data() };
    if (!p.aktif) { S.mesaj = t('Hesabınız pasif yapılmış. Yöneticinizle görüşün.'); await signOut(auth); return; }
    const ss = await getDoc(doc(db, 'salons', p.salonId));
    S.profil = p;
    S.salon = ss.exists() ? { id: ss.id, ...ss.data() } : null;
    if (!sekmelerim(p.rol).some(x => x.id === S.sekme)) S.sekme = 'ana';
    S.mesaj = '';
    if (S.salon) sohbetKontrolBaslat();
  } catch (e) {
    console.error(e);
    S.mesaj = t('Bilgiler yüklenemedi. İnternetinizi kontrol edip sayfayı yenileyin.');
  }
  goster();
}

export function goster() {
  kok.replaceChildren();
  if (!auth.currentUser || !S.profil) { kok.append(girisEkrani()); return; }
  const sekmeler = sekmelerim(S.profil.rol);
  const ekran = { ana: anaEkrani, takvim: takvimEkrani, kasa: kasaEkrani, musteri: musterilerEkrani, ekip: ekipEkrani, salon: salonEkrani, ayarlar: ayarlarEkrani }[S.sekme] || anaEkrani;
  kok.append(
    h('header', { class: 'ust' },
      h('img', { src: 'icons/logo.png', alt: '', class: 'ust-logo' }),
      h('div', { class: 'ust-ad' }, h('strong', null, S.salon ? S.salon.ad : UYGULAMA.ad), h('small', null, UYGULAMA.ad)),
      sohbetDugmesi()),
    h('main', { class: 'icerik' }, ekran()),
    h('nav', { class: 'alt-menu' }, sekmeler.map(s =>
      h('button', { class: 'sekme' + (s.id === S.sekme ? ' secili' : ''), type: 'button', onclick: () => { S.sekme = s.id; sekmeDegisti(s.id); goster(); } },
        h('span', { class: 'sekme-ikon' }, s.ikon), h('span', null, t(s.ad))))));
}

// İnternet durumu: Pro internetle çalışır
function cevrimiciGuncelle() {
  let b = document.getElementById('cevrimdisi');
  if (navigator.onLine) { if (b) b.remove(); return; }
  if (!b) document.body.prepend(h('div', { id: 'cevrimdisi', role: 'alert' }, t('İnternet yok. Kayıt yapılamaz; bağlantı gelince devam edin.')));
}
window.addEventListener('online', cevrimiciGuncelle);
window.addEventListener('offline', cevrimiciGuncelle);
cevrimiciGuncelle();

geriTusunuBaslat(() => { S.sekme = 'ana'; goster(); });

onAuthStateChanged(auth, () => { if (!S.kayitSuruyor) oturumuYukle(); });

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}

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
import { takvimEkrani, randevuyaGit } from './ekranlar/takvim.js';
import { kasaEkrani } from './ekranlar/kasa.js';
import { musterilerEkrani } from './ekranlar/musteriler.js';
import { veriSifirla } from './veri.js';
import { sablonlariYukle, sablonOzelAyarla } from './mesaj.js';
import { bildirimTazele } from './sunucu.js';
import { ekipYenile } from './ekranlar/ekip.js';
import { geriTusunuBaslat, sekmeDegisti } from './geri.js';
import { sohbetDugmesi, sohbetKontrolBaslat, sohbetKontrolDurdur } from './ekranlar/sohbet.js';
import { yoneticiEkrani, yaklasanSay } from './ekranlar/yonetici.js';
import { ulkeSecilmeli, ulkeSecEkrani } from './ekranlar/ulke-sec.js';
import { salonAyarla } from './ulke.js';

const kok = document.getElementById('uygulama');

export async function oturumuYukle() {
  const u = auth.currentUser;
  if (!u) { S.profil = null; S.salon = null; S.yonetici = null; salonAyarla(null); sablonOzelAyarla({}); veriSifirla(); ekipYenile(); sohbetKontrolDurdur(); return goster(); }
  try {
    // Platform yöneticisi mi? (yoneticiler/{uid} belgesi olan ve aktif kişi)
    S.yonetici = null;
    try { const ys = await getDoc(doc(db, 'yoneticiler', u.uid)); if (ys.exists() && ys.data().aktif) S.yonetici = { id: ys.id, ...ys.data() }; } catch (e) { /* yönetici değil */ }
    const ps = await getDoc(doc(db, 'kullanicilar', u.uid));
    if (!ps.exists() && S.yonetici) { S.profil = null; S.salon = null; S.mesaj = ''; S.sekme = 'yonetici'; sablonOzelAyarla({}); veriSifirla(); ekipYenile(); sohbetKontrolDurdur(); yoneticiUyari(); return goster(); }
    if (!ps.exists()) { S.profil = null; S.salon = null; S.mesaj = t('Hesabınız bir salona bağlı değil. Yöneticinizle görüşün.'); return goster(); }
    const p = { id: ps.id, ...ps.data() };
    if (!p.aktif) { S.mesaj = t('Hesabınız pasif yapılmış. Yöneticinizle görüşün.'); await signOut(auth); return; }
    const ss = await getDoc(doc(db, 'salons', p.salonId));
    S.profil = p;
    S.salon = ss.exists() ? { id: ss.id, ...ss.data() } : null;
    salonAyarla(S.salon);
    if (!sekmelerim(p.rol, !!S.yonetici).some(x => x.id === S.sekme)) S.sekme = 'ana';
    if (S.yonetici) yoneticiUyari();
    S.mesaj = '';
    if (S.salon) { sohbetKontrolBaslat(); sablonlariYukle(); bildirimTazele(); }
    gitUygula();
  } catch (e) {
    console.error(e);
    S.mesaj = t('Bilgiler yüklenemedi. İnternetinizi kontrol edip sayfayı yenileyin.');
  }
  goster();
}

// Yönetici girişinde süresi yaklaşan/dolan salon varsa kısa uyarı
let uyarildi = null;
async function yoneticiUyari() {
  const u = auth.currentUser; if (!u || uyarildi === u.uid) return; uyarildi = u.uid;
  try { const n = await yaklasanSay(); if (n > 0) bildir(t('{n} salonun lisansı bitiyor ya da bitti. Yönetici panelinden bakın.', { n }), 'hata'); } catch (e) { /* sessiz */ }
}

export function goster() {
  kok.replaceChildren();
  // Yalnız yönetici hesabı (salona bağlı değil): sadece yönetici paneli
  if (auth.currentUser && !S.profil && S.yonetici) {
    kok.append(
      h('header', { class: 'ust' }, h('img', { src: 'icons/logo.png', alt: '', class: 'ust-logo' }),
        h('div', { class: 'ust-ad' }, h('strong', null, UYGULAMA.ad), h('small', null, t('Yönetici paneli')))),
      h('main', { class: 'icerik' }, yoneticiEkrani()));
    return;
  }
  if (!auth.currentUser || !S.profil) { kok.append(girisEkrani()); return; }
  if (ulkeSecilmeli()) { kok.append(ulkeSecEkrani()); return; }
  const sekmeler = sekmelerim(S.profil.rol, !!S.yonetici);
  const ekran = { yonetici: yoneticiEkrani, ana: anaEkrani, takvim: takvimEkrani, kasa: kasaEkrani, musteri: musterilerEkrani, ekip: ekipEkrani, salon: salonEkrani, ayarlar: ayarlarEkrani }[S.sekme] || anaEkrani;
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

// Bildirime tıklanınca ilgili randevuyu aç ("randevu:YYYY-MM-DD:id")
let bekleyenGit = null;
function gitUygula() {
  if (!bekleyenGit || !S.profil || !S.salon) return;
  const m = /^randevu:(\d{4}-\d{2}-\d{2}):([A-Za-z0-9]+)$/.exec(bekleyenGit); bekleyenGit = null;
  if (!m || !sekmelerim(S.profil.rol, !!S.yonetici).some(x => x.id === 'takvim')) return;
  randevuyaGit(m[1], m[2]); S.sekme = 'takvim'; sekmeDegisti('takvim'); goster();
}
export function gitAyarla(g) { bekleyenGit = g; gitUygula(); }
try { const q = new URLSearchParams(location.search).get('git'); if (q) { bekleyenGit = q; history.replaceState(null, '', location.pathname); } } catch (e) { /* yok */ }
if ('serviceWorker' in navigator) navigator.serviceWorker.addEventListener('message', (e) => { if (e.data && e.data.tur === 'git') gitAyarla(e.data.git); });

geriTusunuBaslat(() => { S.sekme = 'ana'; goster(); });

onAuthStateChanged(auth, () => { if (!S.kayitSuruyor) oturumuYukle(); });

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}

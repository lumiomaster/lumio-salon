import { t } from '../i18n.js';
import { ROLLER } from '../config.js';
import { h, doldur, lisansDurumu } from '../util.js';
import { S } from '../durum.js';
import { yetkiliMi } from '../roller.js';
import { ayariYukle, hizmetleriYukle, ustalariYukle, uyeleriYukle } from '../veri.js';
import { goster } from '../main.js';

const YAKINDA = [
  { ad: 'Stok ve sipariş', ikon: '📦', roller: ['yonetici', 'kidemli', 'ortak', 'sekreter'] },
  { ad: 'Maliyet ve kâr', ikon: '📈', roller: ['yonetici', 'kidemli', 'ortak'] }
];

export function anaEkrani() {
  const p = S.profil, l = lisansDurumu(S.salon);
  let lisansKart;
  if (l.tur === 'DENEME') {
    lisansKart = l.aktif
      ? h('div', { class: 'kart bilgi' }, h('strong', null, t('Deneme sürümü')), h('p', null, t('{n} gün kaldı.', { n: l.kalan })))
      : h('div', { class: 'kart uyari' }, h('strong', null, t('Deneme süresi bitti')), h('p', null, t('Kayıt yapılamaz. Devam etmek için lisans gerekir.')));
  } else if (l.tur === 'AKTIF') {
    lisansKart = l.aktif
      ? h('div', { class: 'kart bilgi' }, h('strong', null, t('Lisans aktif')), h('p', null, t('{n} gün kaldı.', { n: l.kalan })))
      : h('div', { class: 'kart uyari' }, h('strong', null, t('Lisans süresi bitti')), h('p', null, t('Kayıt yapılamaz. Yenilemek için bizimle iletişime geçin.')));
  } else {
    lisansKart = h('div', { class: 'kart uyari' }, h('strong', null, t('Lisans pasif')), h('p', null, t('Bizimle iletişime geçin.')));
  }
  return h('div', { class: 'sayfa' },
    h('h1', null, t('Merhaba {ad}', { ad: p.ad.split(' ')[0] })),
    h('p', { class: 'soluk' }, t(ROLLER[p.rol] || p.rol)),
    lisansKart,
    yetkiliMi(p.rol) ? kurulumKarti() : null,
    h('h2', null, t('Yakında eklenecek')),
    h('div', { class: 'yakinda' }, YAKINDA.filter(y => y.roller.includes(p.rol)).map(y =>
      h('div', { class: 'kart yakinda-oge' }, h('span', { class: 'ikon' }, y.ikon), h('span', null, t(y.ad)), h('small', null, t('Yakında'))))));
}

// Kurulum yardımcısı: salonun hazır olması için eksik adımları gösterir
function kurulumKarti() {
  const kutu = h('div', null);
  Promise.all([ayariYukle(), hizmetleriYukle(), ustalariYukle(), uyeleriYukle()]).then(([ayar, hizmetler, u, uyeler]) => {
    const ustalar = uyeler.filter(x => x.rol === 'usta' && x.aktif);
    const fiyatsiz = hizmetler.filter(x => x.aktif && !(x.fiyat > 0)).length;
    const ustaEksik = ustalar.filter(x => !u.profil[x.id] || !u.profil[x.id].hizmetler.length || !u.mali[x.id]).length;
    const adimlar = [
      { ok: !!ayar, ad: t('Kart komisyon oranını girin'), git: () => { S.sekme = 'salon'; S.salonAlt = 'genel'; goster(); } },
      { ok: hizmetler.length > 0 && fiyatsiz === 0, ad: hizmetler.length === 0 ? t('Hizmetleri ekleyin') : t('{n} hizmetin fiyatını girin', { n: fiyatsiz }), git: () => { S.sekme = 'salon'; S.salonAlt = 'hizmetler'; goster(); } },
      { ok: ustalar.length > 0, ad: t('Ekibe en az bir usta ekleyin'), git: () => { S.sekme = 'ekip'; goster(); } },
      { ok: ustalar.length > 0 && ustaEksik === 0, ad: ustalar.length === 0 ? t('Ustaların hizmet, mesai ve yüzdesini ayarlayın') : (ustaEksik === 0 ? t('Ustaların hizmet ve yüzdesi ayarlı') : t('{n} ustanın hizmet ve yüzdesi eksik', { n: ustaEksik })), git: () => { S.sekme = 'salon'; S.salonAlt = 'ustalar'; goster(); } }
    ];
    if (adimlar.every(a => a.ok)) return;
    doldur(kutu, h('div', { class: 'kart bilgi' }, h('strong', null, t('Salon kurulumu')),
      h('ul', { class: 'kontrol-liste' }, adimlar.map(a => h('li', { class: a.ok ? 'bitti' : '' },
        h('span', null, a.ok ? '✓' : '○'), h('span', null, a.ad),
        a.ok ? null : h('button', { class: 'dugme ikincil kucuk-dugme', type: 'button', onclick: a.git }, t('Aç')))))));
  }).catch(() => {});
  return kutu;
}

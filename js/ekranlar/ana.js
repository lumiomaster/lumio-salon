import { t } from '../i18n.js';
import { ROLLER } from '../config.js';
import { h, lisansDurumu } from '../util.js';
import { S } from '../durum.js';

const YAKINDA = [
  { ad: 'Takvim ve randevu', ikon: '📅', roller: ['yonetici', 'kidemli', 'ortak', 'sekreter', 'usta'] },
  { ad: 'Ödeme ve kasa', ikon: '💳', roller: ['yonetici', 'kidemli', 'ortak', 'sekreter', 'usta'] },
  { ad: 'Müşteri defteri', ikon: '📒', roller: ['yonetici', 'kidemli', 'ortak', 'sekreter', 'usta'] },
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
    h('h2', null, t('Yakında eklenecek')),
    h('div', { class: 'yakinda' }, YAKINDA.filter(y => y.roller.includes(p.rol)).map(y =>
      h('div', { class: 'kart yakinda-oge' }, h('span', { class: 'ikon' }, y.ikon), h('span', null, t(y.ad)), h('small', null, t('Yakında'))))));
}

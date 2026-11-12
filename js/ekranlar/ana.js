import { t } from '../i18n.js';
import { ROLLER, DESTEK_TEL } from '../config.js';
import { h, doldur, lisansDurumu } from '../util.js';
import { S } from '../durum.js';
import { yetkiliMi } from '../roller.js';
import { ayariYukle, hizmetleriYukle, ustalariYukle, uyeleriYukle, urunleriYukle, stokAyariYukle } from '../veri.js';
import { azMi } from '../stok-mantik.js';
import { tarihMetin, tarihEkle } from '../takvim-mantik.js';
import { goster } from '../main.js';
import { musterileriYukle } from '../veri.js';
import { hatirlatmaKarti } from './musteriler.js';
import { gonderimleriYukle } from '../mesaj-kayit.js';
import { mutabakatKarti } from './mutabakat-kart.js';
import { yarinKarti } from './yarin-kart.js';
import { hedefKarti } from './hedef-kart.js';
import { danismanKarti, danismanVar } from './danisman.js';

const YAKINDA = [
  { ad: 'Yapay zekâ danışman', ikon: '🔔', roller: ['yonetici', 'kidemli', 'ortak', 'sekreter', 'usta'] }
];

export function anaEkrani() {
  const p = S.profil, l = lisansDurumu(S.salon);
  let lisansKart;
  const iletisim = () => DESTEK_TEL ? h('div', { class: 'dugme-satir sol' },
    h('button', { class: 'dugme ikincil kucuk-dugme', type: 'button', onclick: () => window.open('https://wa.me/' + DESTEK_TEL + '?text=' + encodeURIComponent(t('Merhaba, {salon} için lisans yenilemek istiyorum.', { salon: S.salon ? S.salon.ad : '' })), '_blank', 'noopener') }, t('WhatsApp ile yenile'))) : null;
  if (l.tur === 'DENEME' || l.tur === 'AKTIF') {
    const ad = l.tur === 'DENEME' ? t('Deneme sürümü') : t('Lisans aktif');
    if (!l.aktif) {
      lisansKart = h('div', { class: 'kart uyari' }, h('strong', null, l.tur === 'DENEME' ? t('Deneme süresi bitti') : t('Lisans süresi bitti')),
        h('p', null, t('Kayıt yapılamaz. Devam etmek için lisansı yenileyin; verileriniz silinmez.')), yetkiliMi(p.rol) ? iletisim() : null);
    } else if (l.kalan <= 7) {
      lisansKart = h('div', { class: 'kart uyari' }, h('strong', null, l.kalan <= 1 ? t('Süreniz yarın ya da bugün doluyor') : t('{n} gün sonra süreniz doluyor', { n: l.kalan })),
        h('p', null, ad + ' · ' + t('Hizmetin kesilmemesi için lisansı yenileyin.')), yetkiliMi(p.rol) ? iletisim() : null);
    } else {
      lisansKart = h('div', { class: 'kart bilgi' }, h('strong', null, ad), h('p', null, t('{n} gün kaldı.', { n: l.kalan })));
    }
  } else {
    lisansKart = h('div', { class: 'kart uyari' }, h('strong', null, t('Lisans pasif')), h('p', null, t('Bizimle iletişime geçin.')), yetkiliMi(p.rol) ? iletisim() : null);
  }
  return h('div', { class: 'sayfa' },
    h('h1', null, t('Merhaba {ad}', { ad: p.ad.split(' ')[0] })),
    h('p', { class: 'soluk' }, t(ROLLER[p.rol] || p.rol)),
    lisansKart,
    mutabakatKarti(),
    p.rol !== 'sekreter' ? hedefKarti() : null,
    danismanKarti(),
    p.rol !== 'usta' ? yarinKarti() : null,
    hatirlatmaKutusu(),
    yetkiliMi(p.rol) ? stokKarti() : null,
    yetkiliMi(p.rol) ? kurulumKarti() : null,
    danismanVar() ? null : h('h2', null, t('Yakında eklenecek')),
    danismanVar() ? null : h('div', { class: 'yakinda' }, YAKINDA.filter(y => y.roller.includes(p.rol)).map(y =>
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

// Ana sayfada: doğum günleri, sonraki ziyareti yaklaşanlar, uzun süredir gelmeyenler (WhatsApp tek tık)
function hatirlatmaKutusu() {
  const kutu = h('div', null);
  const doldurKutu = () => Promise.all([musterileriYukle(), ayariYukle(), gonderimleriYukle().catch(() => ({}))]).then(([liste, ayar, G]) => {
    doldur(kutu, hatirlatmaKarti(liste, ayar, null, doldurKutu, G));
  }).catch(() => {});
  doldurKutu();
  return kutu;
}

// Azalan ürünler ve haftalık sayım hatırlatması (yalnız yönetici/kıdemli/ortak)
function stokKarti() {
  const kutu = h('div', null);
  Promise.all([urunleriYukle(), stokAyariYukle()]).then(([urunler, ayar]) => {
    const aktif = urunler.filter(u => u.aktif !== false);
    if (!aktif.length) return;
    const azlar = aktif.filter(azMi);
    const gecikti = !ayar.sonSayim || ayar.sonSayim < tarihEkle(tarihMetin(new Date()), -7);
    if (!azlar.length && !gecikti) return;
    doldur(kutu, h('div', { class: 'kart bilgi' }, h('strong', null, '📦 ' + t('Stok')),
      azlar.length ? h('p', { class: 'kucuk' }, '⚠️ ' + t('{n} ürün azalıyor: {liste}', { n: azlar.length, liste: azlar.slice(0, 4).map(u => u.ad).join(', ') + (azlar.length > 4 ? '…' : '') })) : null,
      gecikti ? h('p', { class: 'kucuk' }, t('Haftalık sayım zamanı geldi.')) : null,
      h('div', { class: 'dugme-satir sol' }, h('button', { class: 'dugme ikincil kucuk-dugme', type: 'button', onclick: () => { S.sekme = 'salon'; S.salonAlt = 'stok'; goster(); } }, t('Stok sayfasını aç')))));
  }).catch(() => {});
  return kutu;
}

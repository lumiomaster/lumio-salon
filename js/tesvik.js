// Çapraz satış oranı ve aylık hedefler: ayar penceresi (yalnız yönetici/kıdemli/ortak) — Salon > Genel'den açılır
import { t } from './i18n.js';
import { h, doldur, hataMetni, bildir, kilitli, sayi, pencereAc } from './util.js';
import { oranAyariYukle } from './veri.js';
import { oranKaydet } from './oran-ayar.js';
import { OLCU_AD, hedefYazisi } from './hedef-mantik.js';
import { sembol } from './ulke.js';

const MAX_HEDEF = 12;

export async function tesvikAyari(sonra) {
  const icerik = h('div', null, h('p', { class: 'soluk' }, t('Yükleniyor…')));
  const p = pencereAc(t('Çapraz satış ve aylık hedefler'), icerik);
  let oran;
  try { oran = await oranAyariYukle(true); } catch (e) { console.error(e); doldur(icerik, h('div', { class: 'uyari' }, hataMetni(e))); return; }
  let hedefler = oran.hedefler.map(x => ({ ...x }));
  const capraz = h('input', { type: 'text', inputmode: 'decimal', value: String(oran.caprazYuzde).replace('.', ',') });
  const liste = h('div', null);
  const hata = h('div', { class: 'hata', role: 'alert' });
  const dugme = h('button', { class: 'dugme', type: 'button' }, t('Kaydet'));

  const ciz = () => doldur(liste,
    hedefler.length === 0 ? h('p', { class: 'soluk kucuk' }, t('Henüz hedef yok.')) : null,
    hedefler.map((x, i) => {
      const olcu = h('select', { onchange: (e) => { x.olcu = e.target.value; } },
        ['urun', 'capraz'].map(k => h('option', { value: k, selected: x.olcu === k }, t(OLCU_AD[k]))));
      const esik = h('input', { type: 'text', inputmode: 'decimal', value: x.esik ? String(x.esik).replace('.', ',') : '', placeholder: t('Aylık tutar (₺)'), oninput: (e) => { x.esik = sayi(e.target.value); } });
      const tur = h('select', { onchange: (e) => { x.tur = e.target.value; } },
        h('option', { value: 'sabit', selected: x.tur === 'sabit' }, t('Sabit tutar (₺)')),
        h('option', { value: 'yuzde', selected: x.tur === 'yuzde' }, t('Ek yüzde (%)')));
      const deger = h('input', { type: 'text', inputmode: 'decimal', value: x.deger ? String(x.deger).replace('.', ',') : '', placeholder: t('Ödül'), oninput: (e) => { x.deger = sayi(e.target.value); } });
      return h('div', { class: 'kart' },
        h('label', null, t('Ölçü'), olcu),
        h('label', null, t('Hedef (bu tutara ulaşınca), ₺'), esik),
        h('label', null, t('Ödül türü'), tur),
        h('label', null, t('Ödül'), deger),
        h('button', { class: 'dugme ikincil kucuk-dugme', type: 'button', onclick: () => { hedefler.splice(i, 1); ciz(); } }, t('Bu hedefi kaldır')));
    }));
  ciz();

  const ekle = h('button', { class: 'dugme ikincil', type: 'button', onclick: () => {
    if (hedefler.length >= MAX_HEDEF) { hata.textContent = t('En fazla {n} hedef eklenebilir.', { n: MAX_HEDEF }); return; }
    hedefler.push({ id: 'h' + Date.now().toString(36) + hedefler.length, olcu: 'urun', esik: 0, tur: 'sabit', deger: 0 }); ciz();
  } }, t('＋ Hedef ekle'));

  dugme.addEventListener('click', () => {
    hata.textContent = '';
    const c = sayi(capraz.value);
    if (!Number.isFinite(c) || c < 0 || c > 100) { hata.textContent = t('Çapraz satış primi 0 ile 100 arasında olmalı.'); return; }
    for (const x of hedefler) {
      if (!(x.esik > 0) || !(x.deger > 0)) { hata.textContent = t('Her hedefin tutarını ve ödülünü yazın.'); return; }
      if (x.tur === 'yuzde' && x.deger > 100) { hata.textContent = t('Ek yüzde en çok 100 olabilir.'); return; }
    }
    const temiz = hedefler.map(x => ({ id: x.id, olcu: x.olcu, esik: x.esik, tur: x.tur, deger: x.deger }));
    kilitli(dugme, async () => {
      try {
        await oranKaydet({ caprazYuzde: c, hedefler: temiz }, 'Çapraz satış %' + c + ', ' + temiz.length + ' hedef');
        p.kapat(); bildir(t('Kaydedildi')); if (sonra) sonra();
      } catch (err) { console.error(err); hata.textContent = hataMetni(err); }
    });
  });

  doldur(icerik,
    h('label', null, t('Çapraz satış primi, %'), capraz),
    h('p', { class: 'kucuk' }, t('Bir usta, başka ustanın müşterisine ödeme sırasında hizmet sattığında (ek hizmet), komisyon sonrası tutarın bu oranı satan ustaya prim olur. Prim salonun payından ödenir. 0 yazarsanız çapraz satış primi kapanır.')),
    h('h3', null, t('Aylık hedefler')),
    h('p', { class: 'kucuk' }, t('Ürün satışı: ustanın o ayki ürün satış cirosu. Çapraz satış: ustanın o ay sattığı ek hizmetlerin toplamı. Aynı ölçüde birden çok basamak koyabilirsiniz; ulaşılan en yüksek basamağın ödülü verilir (toplanmaz). Ödül "Kasa > Hesap" bölümünde görünür, siz onaylayınca ustanın hesabına eklenir.')),
    liste, ekle, hata, dugme);
}

export const hedefOzeti = (hedefler) => hedefler.map(x => t(OLCU_AD[x.olcu]) + ' ' + String(x.esik).replace('.', ',') + ' ' + sembol() + ' → ' + hedefYazisi(x)).join(' · ');

import { t } from '../i18n.js';
import { h, doldur, para, pencereAc } from '../util.js';
import { ustalariYukle } from '../veri.js';
import { tarihYazi } from '../takvim-mantik.js';
import { satirDokumu } from '../kasa-mantik.js';

// Bir ödeme kaleminin (hizmet ya da ürün) ayrıntısı.
// seviye: 'tam' (yönetici/kıdemli/ortak: usta yüzdesi ve salon payı görünür), 'sekreter' (kâr görünür, usta payı görünmez), 'usta' (yalnız kendi payı)
export async function kalemDetay(o, k, adFn, seviye) {
  const icerik = h('div', null, h('p', { class: 'soluk' }, t('Yükleniyor…')));
  pencereAc(k.ad + (k.tur === 'urun' ? ' (' + t('ürün') + ')' : ''), icerik);
  let mali = null;
  if (seviye === 'tam' && k.ustaUid) { try { mali = (await ustalariYukle()).mali[k.ustaUid] || null; } catch (e) { console.error(e); } }
  const d = satirDokumu(o, k, mali);
  const sat = (a, b, ek) => h('div', { class: 'hesap-satir' + (ek ? ' ' + ek : '') }, h('span', null, a), h('span', null, b));
  const yuzde = k.tur === 'urun' ? (mali ? mali.urunPrimi : null) : (mali ? mali.yuzde : null);
  doldur(icerik, h('div', { class: 'ayrinti' },
    h('div', null, h('strong', null, o.musteriAd || (o.rid ? t('Randevu') : t('Satış')))),
    h('div', { class: 'soluk' }, tarihYazi(o.tarih) + ' · ' + (o.yontem === 'kart' ? t('Kart') : t('Nakit')) + (k.ustaUid && adFn ? ' · ' + adFn(k.ustaUid) : '')),
    h('div', { class: 'kart kasa-ozet' },
      sat(k.tur === 'urun' ? t('Satış fiyatı') : t('Tutar'), para(d.tutar)),
      d.komisyon > 0 ? sat(t('Kart komisyonu (%{o})', { o: String(o.komisyonOrani).replace('.', ',') }), '− ' + para(d.komisyon)) : null,
      d.komisyon > 0 ? sat(t('Komisyon sonrası'), para(d.net)) : null,
      k.tur === 'urun' ? sat(t('Alış fiyatı'), '− ' + para(d.alis)) : null,
      k.tur === 'urun' ? sat(t('Kâr'), para(d.kar), 'ust-cizgi') : null,
      seviye === 'tam' && yuzde != null ? sat(k.tur === 'urun' ? t('Usta ürün primi (kârdan)') : t('Usta yüzdesi (komisyon sonrası)'), '%' + String(yuzde).replace('.', ',')) : null,
      seviye === 'tam' && k.ustaUid ? sat(t('Ustaya kalan'), para(d.pay), 'ust-cizgi') : null,
      seviye === 'usta' ? sat(t('Size kalan'), para(d.pay), 'ust-cizgi') : null,
      seviye === 'tam' ? sat(t('Salonda kalan'), para(d.salon)) : null),
    k.ek ? h('p', { class: 'kucuk' }, t('Bu hizmet ödeme sırasında eklendi.')) : null));
}

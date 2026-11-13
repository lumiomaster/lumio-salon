// Muhasebe için aylık dışa aktarma (saf fonksiyonlar): CSV, Excel'de doğrudan açılır.
// Ayırıcı ";" (Türkçe/Rusça/Almanca Excel), UTF-8 BOM, ondalık ayırıcı seçili dile göre; formül enjeksiyonuna karşı "=+-@" ile başlayan metin kaçırılır.
import { yerel } from './i18n.js';
import { yuvarla, ustaOzetleri, satirPayi, gunOzeti } from './kasa-mantik.js';
import { karHesapla, ayGiderleri } from './kar-mantik.js';

const sayiYaz = (n) => (Number(n) || 0).toLocaleString(yerel(), { useGrouping: false, maximumFractionDigits: 2, minimumFractionDigits: 0 });
const hucre = (v) => {
  if (typeof v === 'number') return sayiYaz(v);
  let x = String(v == null ? '' : v);
  if (/^[=+\-@\t\r]/.test(x)) x = "'" + x;
  return '"' + x.replace(/"/g, '""') + '"';
};
export function csvYap(basliklar, satirlar) {
  return '﻿' + [basliklar.map(hucre).join(';')].concat(satirlar.map(s => s.map(hucre).join(';'))).join('\r\n') + '\r\n';
}

// Dosya adı için güvenli (yalnız ASCII) parça: ü→u, ş→s, ı→i...; harf kalmazsa "salon"
export const dosyaAdi = (salonAd, ay, tur) => {
  let a = String(salonAd || '').replace(/İ/g, 'i').replace(/I/g, 'i').toLowerCase().replace(/[ığüşöç]/g, (c) => ({ 'ı': 'i', 'ğ': 'g', 'ü': 'u', 'ş': 's', 'ö': 'o', 'ç': 'c' }[c]));
  try { a = a.normalize('NFD').replace(/[\u0300-\u036f]/g, ''); } catch (_) { /* eski tarayıcı */ }
  a = a.replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 30) || 'salon';
  return a + '_' + ay + '_' + tur + '.csv';
};

// 1) Ödemeler: her ödeme bir satır (iptal edilenler de görünür, durum sütunuyla)
export function odemeSatirlari(odemeler, ad, T) {
  return odemeler.slice().sort((a, b) => String(a.tarih).localeCompare(String(b.tarih))).map(o => {
    const gecerli = o.durum === 'gecerli';
    const net = gecerli ? yuvarla(o.toplam - (o.komisyon || 0)) : 0;
    return [o.tarih, o.musteriAd || '', o.yontem === 'kart' ? T.kart : T.nakit,
      (o.kalemler || []).map(k => k.ad).join(' + '),
      [...new Set((o.kalemler || []).map(k => ad(k.ustaUid)).filter(Boolean))].join(', '),
      yuvarla(o.toplam), o.komisyonOrani || 0, yuvarla(o.komisyon || 0), net, gecerli ? T.gecerli : T.iptal];
  });
}
// 2) Kalem dökümü: her hizmet/ürün satırı ayrı, usta payıyla
export function kalemSatirlari(odemeler, mali, taban, ad, T) {
  const s = [];
  odemeler.filter(o => o.durum === 'gecerli').slice().sort((a, b) => String(a.tarih).localeCompare(String(b.tarih))).forEach(o => (o.kalemler || []).forEach(k => {
    s.push([o.tarih, o.musteriAd || '', k.ad, k.tur === 'urun' ? T.urun : T.hizmet, ad(k.ustaUid), yuvarla(k.tutar), k.tur === 'urun' ? yuvarla(k.alis || 0) : 0,
      k.ustaUid ? yuvarla(satirPayi(o, k, mali[k.ustaUid], taban)) : 0]);
  }));
  return s;
}
// 3) Usta hakedişi (aylık toplam)
export function ustaSatirlari(odemeler, mali, taban, ad) {
  const oz = ustaOzetleri(odemeler, mali, taban);
  return Object.entries(oz).map(([uid, v]) => [ad(uid), v.hizmet, v.urun, v.capraz, v.komisyon, v.hakedis]).sort((a, b) => String(a[0]).localeCompare(String(b[0])));
}
// 4) Giderler (o aya düşenler; aylık tekrarlayanlar dahil)
export function giderSatirlari(giderler, ay, T) {
  return ayGiderleri(giderler, ay).slice().sort((a, b) => String(a.tarih).localeCompare(String(b.tarih))).map(g => [g.tarih, g.kategori, yuvarla(g.tutar), g.not || '', g.aylik ? T.aylik : T.tek]);
}
// 5) Aylık kasa/kâr özeti
export function ozetSatirlari(D, T) {
  const r = karHesapla(D); const z = gunOzeti(D.odemeler.filter(o => o.durum === 'gecerli'));
  return [[T.ciro, r.ciro], [T.nakit, z.nakit], [T.kart, z.kart], [T.komisyon, r.komisyon], [T.hakedis, r.hakedis], [T.salonPayi, r.salonPayi],
    [T.urunMaliyet, r.urunMaliyet], [T.formulMaliyet, r.formul.toplam], [T.gider, r.gider], [T.ikramiye, r.ikramiye], [T.kar, r.kar], [T.adet, r.adet]];
}

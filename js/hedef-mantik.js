// Aylık hedefler ve ikramiye hesabı: ekrandan bağımsız, saf fonksiyonlar.
// Hedef: { id, olcu: 'urun' | 'capraz', esik, tur: 'sabit' | 'yuzde', deger }
//   olcu 'urun'   : ustanın o ayki ürün satış cirosu
//   olcu 'capraz' : ustanın o ay çapraz sattığı hizmetlerin toplam tutarı
//   ödül          : sabit tutar ya da ölçünün yüzdesi. Aynı ölçüde birden fazla basamak varsa ulaşılan EN YÜKSEK basamak geçerlidir (toplanmaz).
import { yuvarla, caprazListesi } from './kasa-mantik.js';

export const OLCU_AD = { urun: 'Ürün satışı', capraz: 'Çapraz satış' };

// Ödeme listesinden (geçerli olanlar) ustaların o ayki ölçüleri: { uid: { urun, capraz } }
export function ayOlculeri(odemeler, ay) {
  const m = {};
  const al = (uid) => (m[uid] = m[uid] || { urun: 0, capraz: 0 });
  odemeler.filter(o => o.durum === 'gecerli' && String(o.tarih || '').startsWith(ay)).forEach(o => {
    (o.kalemler || []).forEach(k => { if (k.tur === 'urun' && k.ustaUid) al(k.ustaUid).urun += k.tutar; });
    caprazListesi(o).forEach(c => { al(c.ustaUid).capraz += c.tutar; });
  });
  Object.values(m).forEach(x => { x.urun = yuvarla(x.urun); x.capraz = yuvarla(x.capraz); });
  return m;
}

// Tek ölçü için durum: ulaşılan basamak, ikramiye, sonraki basamak ve kalan tutar
export function olcuDurumu(deger, olcu, hedefler) {
  const l = (hedefler || []).filter(x => x.olcu === olcu && x.esik > 0).sort((a, b) => a.esik - b.esik);
  const ulasilan = l.filter(x => deger >= x.esik).pop() || null;
  const sonraki = l.find(x => deger < x.esik) || null;
  const ikramiye = ulasilan ? yuvarla(ulasilan.tur === 'yuzde' ? deger * ulasilan.deger / 100 : ulasilan.deger) : 0;
  return { deger, ulasilan, sonraki, kalan: sonraki ? yuvarla(sonraki.esik - deger) : 0, ikramiye };
}

// Bir ustanın ayı: ürün + çapraz durumları ve toplam ikramiye
export function ustaAyi(olc, hedefler) {
  const o = olc || { urun: 0, capraz: 0 };
  const urun = olcuDurumu(o.urun, 'urun', hedefler), capraz = olcuDurumu(o.capraz, 'capraz', hedefler);
  return { urun, capraz, ikramiye: yuvarla(urun.ikramiye + capraz.ikramiye) };
}

export const hedefYazisi = (h) => (h.tur === 'yuzde' ? '%' + String(h.deger).replace('.', ',') : String(h.deger).replace('.', ',') + ' ₺');

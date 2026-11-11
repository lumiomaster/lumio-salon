// Maliyet ve kâr hesapları (saf fonksiyonlar).
// Salon kârı = (kart komisyonu düşülmüş ciro − ustaların hakedişi) − satılan ürünlerin alış maliyeti − formülde kullanılan ürünlerin maliyeti − giderler
import { yuvarla, ustaOzetleri, gunOzeti, satirNet, satirPayi } from './kasa-mantik.js';
import { birimMaliyet } from './stok-mantik.js';

const gecerli = (o) => o.durum === 'gecerli';

// "2026-11" -> {bas:'2026-11-01', bit:'2026-11-31'} (tarihler metin olarak karşılaştırıldığı için 31 her ay için yeter)
export const ayAralik = (ay) => ({ bas: ay + '-01', bit: ay + '-31' });
export function ayEkle(ay, n) { const [y, m] = ay.split('-').map(Number); const d = new Date(y, m - 1 + n, 1); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'); }
const AYLAR = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
export const ayYazi = (ay) => { const [y, m] = ay.split('-').map(Number); return AYLAR[m - 1] + ' ' + y; };

// O aya düşen giderler. Aylık tekrarlayan: başladığı aydan itibaren, bitişine (varsa) kadar her ay bir kez
export function ayGiderleri(giderler, ay) {
  return giderler.filter(g => !g.iptal).filter(g => {
    if (g.aylik) return ay >= g.tarih.slice(0, 7) && (!g.bitis || ay <= g.bitis);
    return g.tarih.slice(0, 7) === ay;
  }).sort((a, b) => (a.tarih < b.tarih ? 1 : -1));
}

// Formülde kullanılan ürünlerin maliyeti: stok hareketlerinden (formül hareketi negatif; düzeltmeler pozitif)
export function formulMaliyeti(hareketler, urunler) {
  const per = new Map();
  hareketler.filter(x => x.tur === 'formul').forEach(x => per.set(x.urunId, (per.get(x.urunId) || 0) - x.miktar));
  const kalemler = [];
  per.forEach((miktar, id) => {
    const u = urunler.find(y => y.id === id); if (!u || !miktar) return;
    const bm = birimMaliyet(u) || 0;
    kalemler.push({ urun: u, miktar: yuvarla(miktar), maliyet: yuvarla(miktar * bm) });
  });
  return { toplam: yuvarla(kalemler.reduce((a, k) => a + k.maliyet, 0)), kalemler: kalemler.sort((a, b) => b.maliyet - a.maliyet) };
}

export function karHesapla({ odemeler, mali, taban, hareketler, urunler, giderler, ay, ikramiyeler }) {
  const gec = odemeler.filter(gecerli);
  const z = gunOzeti(gec);
  const oz = ustaOzetleri(gec, mali, taban);
  const hakedis = yuvarla(Object.values(oz).reduce((a, s) => a + s.hakedis, 0));
  let hizmetCiro = 0, urunCiro = 0, urunMaliyet = 0;
  gec.forEach(o => (o.kalemler || []).forEach(k => { if (k.tur === 'urun') { urunCiro += k.tutar; urunMaliyet += (k.alis || 0); } else hizmetCiro += k.tutar; }));
  const f = formulMaliyeti(hareketler, urunler);
  const gl = ayGiderleri(giderler, ay);
  const gider = yuvarla(gl.reduce((a, g) => a + g.tutar, 0));
  const ikramiye = yuvarla((ikramiyeler || []).reduce((a, x) => a + (x.tutar || 0), 0));
  const salonPayi = yuvarla(z.net - hakedis);
  return {
    adet: z.adet, ciro: yuvarla(z.nakit + z.kart), nakit: z.nakit, kart: z.kart, komisyon: z.komisyon, net: z.net,
    hizmetCiro: yuvarla(hizmetCiro), urunCiro: yuvarla(urunCiro), hakedis, salonPayi,
    urunMaliyet: yuvarla(urunMaliyet), formul: f, gider, giderler: gl, ikramiye,
    kar: yuvarla(salonPayi - urunMaliyet - f.toplam - gider - ikramiye)
  };
}

// Hizmet bazında kârlılık: ödeme kalemleri + o hizmette formülle kullanılan ürünlerin maliyeti (randevu_kalemSırası kayıtları)
export function hizmetKarliligi({ odemeler, mali, islemler, urunler }) {
  const isl = new Map(islemler.map(x => [x.id, x]));
  const harita = new Map();
  odemeler.filter(gecerli).forEach(o => (o.kalemler || []).forEach((k, i) => {
    if (k.tur === 'urun') return;
    const r = harita.get(k.ad) || { ad: k.ad, adet: 0, ciro: 0, net: 0, usta: 0, maliyet: 0 };
    r.adet++; r.ciro += k.tutar; r.net += satirNet(o, k); r.usta += satirPayi(o, k, mali[k.ustaUid]);
    const x = o.rid && !k.ek ? isl.get(o.rid + '_' + i) : null;
    if (x && x.urunler) x.urunler.forEach(p => { const u = urunler.find(y => y.id === p.urunId); r.maliyet += (Number(p.miktar) || 0) * (u ? (birimMaliyet(u) || 0) : 0); });
    harita.set(k.ad, r);
  }));
  return [...harita.values()].map(r => ({ ...r, ciro: yuvarla(r.ciro), net: yuvarla(r.net), usta: yuvarla(r.usta), maliyet: yuvarla(r.maliyet), kar: yuvarla(r.net - r.usta - r.maliyet) })).sort((a, b) => b.kar - a.kar);
}

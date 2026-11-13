// Para sızıntısı taraması (saf fonksiyonlar): salona çok az kalan, sıfır fiyatlı ya da zararına satılan kalemleri bulur.
// Salonda kalan = kart komisyonu düşülmüş tutar − ustanın hakedişi − formülde kullanılan malzemenin maliyeti.
import { yuvarla, satirNet, satirPayi } from './kasa-mantik.js';
import { birimMaliyet } from './stok-mantik.js';

export const SIZINTI_ESIK = 15;   // salonda kalan pay bu yüzdenin altındaysa alarm

// Kalemde kullanılan malzemenin maliyeti. Randevudan gelen kalem: "randevuNo_sıra"; ödemede eklenen: "ödemeNo_e…" (hizmet adıyla eşleşir)
function malzemeMaliyeti(o, k, i, islemler, urunler) {
  let x = o.rid && !k.ek ? islemler.find(y => y.id === o.rid + '_' + i) : null;
  if (!x && o.id) x = islemler.find(y => typeof y.id === 'string' && y.id.startsWith(o.id + '_e') && y.hizmet === String(k.ad || '').slice(0, 60));
  if (!x || !Array.isArray(x.urunler)) return 0;
  return yuvarla(x.urunler.reduce((a, p) => { const u = urunler.find(z => z.id === p.urunId); return a + (Number(p.miktar) || 0) * (u ? (birimMaliyet(u) || 0) : 0); }, 0));
}

// Dönüş: [{ tur: 'dusuk' | 'sifir' | 'zarar', odemeId, tarih, musteriAd, ad, ustaUid, tutar, net, usta, maliyet, salon, oran }]
export function sizintiTara({ odemeler, mali, islemler, urunler, esik }) {
  const lim = esik == null ? SIZINTI_ESIK : esik;
  const sonuc = [];
  (odemeler || []).filter(o => o.durum === 'gecerli').forEach(o => (o.kalemler || []).forEach((k, i) => {
    const temel = { odemeId: o.id, tarih: o.tarih, musteriAd: o.musteriAd || '', ad: k.ad || '', ustaUid: k.ustaUid || '', tutar: yuvarla(k.tutar) };
    if (k.tur === 'urun') {
      if ((k.alis || 0) > k.tutar) sonuc.push({ ...temel, tur: 'zarar', net: yuvarla(satirNet(o, k)), usta: 0, maliyet: yuvarla(k.alis || 0), salon: yuvarla(k.tutar - (k.alis || 0)), oran: 0 });
      return;
    }
    if (k.tur === 'capraz') return;
    if (!(k.tutar > 0)) { if (!o.sadakat) sonuc.push({ ...temel, tur: 'sifir', net: 0, usta: 0, maliyet: 0, salon: 0, oran: 0 }); return; }
    const net = satirNet(o, k), usta = satirPayi(o, k, mali ? mali[k.ustaUid] : null), maliyet = malzemeMaliyeti(o, k, i, islemler || [], urunler || []);
    const salon = net - usta - maliyet, oran = net > 0 ? salon / net * 100 : 0;
    if (oran < lim) sonuc.push({ ...temel, tur: 'dusuk', net: yuvarla(net), usta: yuvarla(usta), maliyet, salon: yuvarla(salon), oran: Math.round(oran) });
  }));
  return sonuc.sort((a, b) => a.salon - b.salon);
}

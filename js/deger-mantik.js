// "Uygulama size ne kazandırdı" hesapları (saf fonksiyonlar). Tüm rakamlar salonun kendi kayıtlarından gelir.
import { yuvarla } from './kasa-mantik.js';
import { tarihEkle } from './takvim-mantik.js';

export const GERI_PENCERE = 30;   // davetten sonra bu kadar gün içindeki ilk ödeme "geri gelen" sayılır

// Geri çağırma ("davet") mesajından sonra GERI_PENCERE gün içinde ödemesi olan müşteriler.
// Ödeme ayı: bas..bit (YYYY-MM-DD). Aynı davet için yalnız ilk ödeme sayılır; tutar gerçekten ödenen tutardır.
export function geriKazanim({ mesajlar, odemeler, bas, bit }) {
  const gec = (odemeler || []).filter(o => o.durum === 'gecerli' && o.musteriId).sort((a, b) => (a.tarih < b.tarih ? -1 : 1));
  const sayilan = new Set(), liste = [];
  (mesajlar || []).filter(m => m.tur === 'davet' && m.musteriId && m.gun).sort((a, b) => (a.gun < b.gun ? -1 : 1)).forEach(m => {
    const son = tarihEkle(m.gun, GERI_PENCERE);
    const o = gec.find(x => x.musteriId === m.musteriId && x.tarih > m.gun && x.tarih <= son);
    if (!o || o.tarih < bas || o.tarih > bit || sayilan.has(o.id)) return;
    sayilan.add(o.id);
    liste.push({ musteriId: m.musteriId, musteriAd: o.musteriAd || '', davetGun: m.gun, odemeGun: o.tarih, tutar: yuvarla(o.toplam) });
  });
  return { adet: liste.length, tutar: yuvarla(liste.reduce((a, x) => a + x.tutar, 0)), liste };
}

// Usta bağımlılığı: bir müşterinin hizmet cirosunun en az `oran` yüzdesi tek ustadaysa ve en az `minZiyaret` ödemesi varsa "o ustaya bağlı".
// Dönüş: { musteri (en az minZiyaret ziyareti olan), bagli, oranMusteri, ciro, riskCiro, oranCiro, ustalar: [{ uid, musteri, ciro, oranCiro }] }
export function ustaBagimliligi({ odemeler, oran = 80, minZiyaret = 3 }) {
  const m = new Map();
  (odemeler || []).filter(o => o.durum === 'gecerli' && o.musteriId).forEach(o => {
    const r = m.get(o.musteriId) || { ziyaret: 0, ciro: 0, ustalar: new Map() };
    r.ziyaret++;
    (o.kalemler || []).forEach(k => { if (k.tur === 'urun' || k.tur === 'capraz' || !k.ustaUid || !(k.tutar > 0)) return; r.ciro += k.tutar; r.ustalar.set(k.ustaUid, (r.ustalar.get(k.ustaUid) || 0) + k.tutar); });
    m.set(o.musteriId, r);
  });
  let musteri = 0, bagli = 0, ciro = 0, riskCiro = 0;
  const us = new Map();
  m.forEach(r => {
    if (r.ziyaret < minZiyaret || r.ciro <= 0) return;
    musteri++; ciro += r.ciro;
    let en = null; r.ustalar.forEach((v, uid) => { if (!en || v > en.v) en = { uid, v }; });
    if (en && en.v / r.ciro * 100 >= oran) {
      bagli++; riskCiro += r.ciro;
      const u = us.get(en.uid) || { uid: en.uid, musteri: 0, ciro: 0 };
      u.musteri++; u.ciro += r.ciro; us.set(en.uid, u);
    }
  });
  return {
    musteri, bagli, oranMusteri: musteri ? Math.round(bagli / musteri * 100) : 0, ciro: yuvarla(ciro), riskCiro: yuvarla(riskCiro), oranCiro: ciro ? Math.round(riskCiro / ciro * 100) : 0,
    ustalar: [...us.values()].map(u => ({ ...u, ciro: yuvarla(u.ciro), oranCiro: ciro ? Math.round(u.ciro / ciro * 100) : 0 })).sort((a, b) => b.ciro - a.ciro)
  };
}

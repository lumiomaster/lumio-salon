import { S } from './durum.js';
import { auth, db, doc, collection, serverTimestamp, increment } from './fb.js';
import { tarihMetin } from './takvim-mantik.js';

const yv = (n) => Math.round((Number(n) || 0) * 100) / 100;
const uRef = (id) => doc(db, 'salons', S.salon.id, 'urunler', id);

export function stokHareketi(b, urunId, miktar, tur, ref, not) {
  b.set(doc(collection(db, 'salons', S.salon.id, 'stokHareket')), {
    urunId, miktar: yv(miktar), tur, ref: ref || '', not: (not || '').slice(0, 100), uid: auth.currentUser.uid, gun: tarihMetin(new Date()), zaman: serverTimestamp()
  });
}

const harita = (liste) => { const m = new Map(); (liste || []).forEach(x => m.set(x.urunId, (m.get(x.urunId) || 0) + (Number(x.miktar) || 0))); return m; };

// Formül kayıtlarındaki ürün kullanımı (gram/adet) farkını stoktan düşer. items: [{ islemId, eski: [{urunId, miktar}], yeni: [...], ad }]
// Aynı ürün birden çok kayıtta geçiyorsa stok belgesi tek kez güncellenir.
export function formulStokYaz(b, items) {
  const toplam = new Map();
  items.forEach(it => {
    const e = harita(it.eski), y = harita(it.yeni);
    new Set([...e.keys(), ...y.keys()]).forEach(id => {
      const fark = yv((y.get(id) || 0) - (e.get(id) || 0));
      if (!fark) return;
      toplam.set(id, yv((toplam.get(id) || 0) - fark));
      stokHareketi(b, id, -fark, 'formul', it.islemId, it.ad);
    });
  });
  toplam.forEach((v, id) => b.update(uRef(id), { stok: increment(v), guncelleme: serverTimestamp() }));
}

// Ödemedeki ürün satışları: stoktan düşer (ters=true iptalde geri ekler). kalemler: ödeme kalemleri (urunId + temel birim miktarı: stokMiktar)
export function satisStokYaz(b, odemeId, kalemler, ters) {
  const toplam = new Map();
  (kalemler || []).filter(k => k.tur === 'urun' && k.urunId && k.stokMiktar > 0).forEach(k => {
    const d = ters ? k.stokMiktar : -k.stokMiktar;
    toplam.set(k.urunId, yv((toplam.get(k.urunId) || 0) + d));
    stokHareketi(b, k.urunId, d, ters ? 'duzeltme' : 'satis', odemeId, ters ? 'Ödeme iptali: ' + k.ad : k.ad);
  });
  toplam.forEach((v, id) => b.update(uRef(id), { stok: increment(v), guncelleme: serverTimestamp() }));
}

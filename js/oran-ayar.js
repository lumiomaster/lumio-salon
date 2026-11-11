// Oran ayarları (ayarlar/oranlar): oran grupları, çapraz satış oranı ve aylık hedefler. Belge bütün olarak yazılır.
import { S } from './durum.js';
import { auth, db, doc, collection, writeBatch, serverTimestamp } from './fb.js';
import { oranAyariYukle, oranOnbellekSil } from './veri.js';

// patch: { gruplar?, caprazYuzde?, hedefler? }; yazılmayanlar mevcut değerinden alınır
export async function oranKaydet(patch, ayrinti) {
  const simdiki = await oranAyariYukle(true);
  const yeni = { gruplar: simdiki.gruplar, caprazYuzde: simdiki.caprazYuzde, hedefler: simdiki.hedefler, ...patch };
  const b = writeBatch(db);
  b.set(doc(db, 'salons', S.salon.id, 'ayarlar', 'oranlar'), { ...yeni, guncelleme: serverTimestamp() });
  b.set(doc(collection(db, 'salons', S.salon.id, 'kayitlar')), { uid: auth.currentUser.uid, islem: 'oran_ayari', hedef: S.salon.id, ayrinti: ayrinti || 'Oran ayarı', zaman: serverTimestamp() });
  await b.commit();
  oranOnbellekSil();
  return oranAyariYukle(true);
}

export const grupAdi = (gruplar, id) => { if (!id) return 'Genel'; const g = (gruplar || []).find(x => x.id === id); return g ? g.ad : 'Genel'; };
export const yeniGrupId = () => 'g' + Date.now().toString(36);

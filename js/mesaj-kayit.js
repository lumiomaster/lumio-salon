import { t } from './i18n.js';
import { onayIste, bildir } from './util.js';
import { S } from './durum.js';
import { auth, db, doc, getDoc, getDocs, collection, query, where, writeBatch, serverTimestamp } from './fb.js';
import { uyeleriYukle } from './veri.js';
import { tarihMetin, tarihEkle } from './takvim-mantik.js';
import { waAc, tarihTR } from './mesaj.js';

// Müşteriye giden mesajların kaydı: aynı mesaj ikinci kez gitmesin, kim gönderdi görünsün.
// Kayıt adı: müşteri_tür_anahtar (doğum günü: yıl; sonraki ziyaret: tarih; davet: son ziyaret tarihi; onay: randevu no)
export const mesajAnahtar = (musteriId, tur, anahtar) => musteriId + '_' + tur + '_' + anahtar;

// Son 60 günde gönderilenler: { anahtar: { ad, gun } }
export async function gonderimleriYukle() {
  const bas = tarihEkle(tarihMetin(new Date()), -60);
  const [sn, uyeler] = await Promise.all([getDocs(query(collection(db, 'salons', S.salon.id, 'mesajlar'), where('gun', '>=', bas))), uyeleriYukle()]);
  const harita = {};
  sn.docs.forEach(d => { const v = d.data(); harita[d.id] = { ad: ((uyeler.find(u => u.id === v.gonderen) || { ad: '?' }).ad), gun: v.gun }; });
  return harita;
}

export async function gonderimVarMi(musteriId, tur, anahtar) {
  const d = await getDoc(doc(db, 'salons', S.salon.id, 'mesajlar', mesajAnahtar(musteriId, tur, anahtar)));
  if (!d.exists()) return null;
  const v = d.data();
  const uyeler = await uyeleriYukle();
  return { ad: (uyeler.find(u => u.id === v.gonderen) || { ad: '?' }).ad, gun: v.gun };
}

export const gonderilmisYazi = (g) => t('Gönderildi · {ad}, {gun}', { ad: g.ad.split(' ')[0], gun: tarihTR(g.gun).slice(0, 5) });

// WhatsApp'ı açar ve gönderimi kaydeder. onceki doluysa önce uyarır.
export async function mesajGonder({ musteriId, tel, tur, anahtar, metin, onceki, yenile }) {
  if (onceki && !(await onayIste(t('Bu mesaj {gun} günü {ad} tarafından zaten gönderilmiş. Yine de tekrar gönderilsin mi?', { gun: tarihTR(onceki.gun), ad: onceki.ad }), t('Evet, tekrar gönder')))) return;
  waAc(tel, metin);
  if (onceki || !musteriId) return;
  try {
    const b = writeBatch(db);
    b.set(doc(db, 'salons', S.salon.id, 'mesajlar', mesajAnahtar(musteriId, tur, anahtar)), { musteriId, tur, anahtar, gonderen: auth.currentUser.uid, gun: tarihMetin(new Date()), zaman: serverTimestamp() });
    await b.commit();
    if (yenile) yenile();
  } catch (e) { console.error(e); bildir(t('Mesaj açıldı ama gönderim kaydı tutulamadı.'), 'hata'); }
}

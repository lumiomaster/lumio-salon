// Salon verilerinin yüklenmesi ve önbelleği. Ekranlar buradan okur, değişiklikten sonra zorla yeniler.
import { S } from './durum.js';
import { gorenMi } from './roller.js';
import { db, doc, getDoc, getDocs, collection, query, where, writeBatch, serverTimestamp } from './fb.js';

const V = { salonId: null, hizmetler: null, ustalar: null, ustaMali: null, ayar: undefined, uyeler: null };

function kontrol() {
  const id = S.salon ? S.salon.id : null;
  if (V.salonId !== id) Object.assign(V, { salonId: id, hizmetler: null, ustalar: null, ustaMali: null, ayar: undefined, uyeler: null });
}
const yol = (...p) => collection(db, 'salons', S.salon.id, ...p);

export async function hizmetleriYukle(zorla) {
  kontrol();
  if (V.hizmetler && !zorla) return V.hizmetler;
  const sn = await getDocs(yol('hizmetler'));
  V.hizmetler = sn.docs.map(d => ({ id: d.id, ...d.data() }))
    .sort((a, b) => (a.kategori || '').localeCompare(b.kategori || '', 'tr') || a.ad.localeCompare(b.ad, 'tr'));
  return V.hizmetler;
}

export async function ayariYukle(zorla) {
  kontrol();
  if (V.ayar !== undefined && !zorla) return V.ayar;
  const d = await getDoc(doc(db, 'salons', S.salon.id, 'ayarlar', 'genel'));
  V.ayar = d.exists() ? d.data() : null;
  return V.ayar;
}

export async function uyeleriYukle(zorla) {
  kontrol();
  if (V.uyeler && !zorla) return V.uyeler;
  const sn = await getDocs(query(collection(db, 'kullanicilar'), where('salonId', '==', S.salon.id)));
  V.uyeler = sn.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => a.ad.localeCompare(b.ad, 'tr'));
  return V.uyeler;
}

// Usta profilleri ve usta payları: { uid: veri }
export async function ustalariYukle(zorla) {
  kontrol();
  if (V.ustalar && V.ustaMali && !zorla) return { profil: V.ustalar, mali: V.ustaMali };
  // Usta payları yalnız yönetici, kıdemli ve ortak için toplu okunur. Usta ve sekreter okuyamaz
  // (kurallar koleksiyonun tamamını okumaya izin vermez), bu yüzden onlar için boş bırakılır.
  const mali = gorenMi(S.profil.rol);
  const [a, b] = await Promise.all([getDocs(yol('ustalar')), mali ? getDocs(yol('ustaMali')) : Promise.resolve({ docs: [] })]);
  V.ustalar = {}; a.docs.forEach(d => { V.ustalar[d.id] = d.data(); });
  V.ustaMali = {}; b.docs.forEach(d => { V.ustaMali[d.id] = d.data(); });
  return { profil: V.ustalar, mali: V.ustaMali };
}

// Ekipte kişi eklenince ya da değişince çağrılır
export function uyelerGecersiz() { V.uyeler = null; }

export function veriSifirla() { Object.assign(V, { salonId: null, hizmetler: null, ustalar: null, ustaMali: null, ayar: undefined, uyeler: null }); }

// ---- Takvim verisi: her seferinde taze okunur (önbellek yok; başkası randevu almış olabilir) ----
// Tarih aralığındaki randevular (bas ve bit dahil), saate göre sıralı
export async function randevulariYukle(bas, bit) {
  kontrol();
  // Usta yalnızca adının geçtiği randevuları okuyabilir (kurallar). Aralık sorgusu ile birleşmez, bu yüzden usta için tek gün sorulur.
  const usta = S.profil.rol === 'usta' ? [where('ustalar', 'array-contains', S.profil.id)] : [];
  if (usta.length && bas !== bit) return [];
  const q = bas === bit
    ? query(yol('randevular'), where('tarih', '==', bas), ...usta)
    : query(yol('randevular'), where('tarih', '>=', bas), where('tarih', '<=', bit));
  const sn = await getDocs(q);
  return sn.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => a.tarih.localeCompare(b.tarih) || a.bas - b.bas);
}

// Bir günün dolu dilimleri: { kilitId: randevuId }
export async function kilitleriYukle(tarih) {
  kontrol();
  const sn = await getDocs(query(yol('slotlar'), where('tarih', '==', tarih)));
  const m = {}; sn.docs.forEach(d => { m[d.id] = d.data().rid; });
  return m;
}

// ---- Kasa verisi (taze okunur) ----
const sirala = (a, b) => (a.zaman && b.zaman ? (a.zaman.toMillis ? a.zaman.toMillis() : 0) - (b.zaman.toMillis ? b.zaman.toMillis() : 0) : 0);
const liste = (sn) => sn.docs.map(d => ({ id: d.id, ...d.data() }));

// Şu anki hesap dönemi numarası
export async function donemiYukle() {
  kontrol();
  const d = await getDoc(doc(db, 'salons', S.salon.id, 'ayarlar', 'kapanis'));
  return d.exists() ? d.data().donem : 0;
}
// Bir günün ödemeleri (yönetici, kıdemli, ortak, sekreter)
export async function gunOdemeleriniYukle(tarih) {
  kontrol();
  return liste(await getDocs(query(yol('odemeler'), where('tarih', '==', tarih)))).sort(sirala);
}
// Bir dönemin ödemeleri. uid verilirse yalnız o ustanın adının geçtikleri (usta kendi için okur)
export async function donemOdemeleriniYukle(donem, uid) {
  kontrol();
  const q = uid
    ? query(yol('odemeler'), where('donem', '==', donem), where('ustalar', 'array-contains', uid))
    : query(yol('odemeler'), where('donem', '==', donem));
  return liste(await getDocs(q)).sort(sirala);
}
export async function avanslariYukle(donem, uid) {
  kontrol();
  const q = uid
    ? query(yol('avanslar'), where('donem', '==', donem), where('ustaUid', '==', uid))
    : query(yol('avanslar'), where('donem', '==', donem));
  return liste(await getDocs(q)).sort(sirala);
}
// Bir günün mutabakatları (yönetici, kıdemli, ortak)
export async function gunMutabakatiniYukle(tarih) {
  kontrol();
  return liste(await getDocs(query(yol('mutabakat'), where('tarih', '==', tarih))));
}
export async function benimMutabakatim(uid, tarih) {
  kontrol();
  const d = await getDoc(doc(db, 'salons', S.salon.id, 'mutabakat', uid + '_' + tarih));
  return d.exists() ? d.data() : null;
}
// Ustanın kendi mutabakat kayıtları (tümü)
export async function mutabakatlarimiYukle(uid) {
  kontrol();
  return liste(await getDocs(query(yol('mutabakat'), where('ustaUid', '==', uid))));
}
// Devreden borçlar: { uid: devir }
export async function devirleriYukle(uid) {
  kontrol();
  if (uid) {
    const d = await getDoc(doc(db, 'salons', S.salon.id, 'ustaDevir', uid));
    return d.exists() ? { [uid]: d.data().devir } : {};
  }
  const m = {}; (await getDocs(yol('ustaDevir'))).docs.forEach(d => { m[d.id] = d.data().devir; });
  return m;
}
export async function benimMalim(uid) {
  kontrol();
  const d = await getDoc(doc(db, 'salons', S.salon.id, 'ustaMali', uid));
  return d.exists() ? d.data() : null;
}
export async function donemleriYukle() {
  kontrol();
  return liste(await getDocs(yol('donemler'))).sort((a, b) => b.donem - a.donem);
}

// ---- Müşteri defteri ----
export async function musterileriYukle() {
  kontrol();
  const q = S.profil.rol === 'usta' ? query(yol('musteriler'), where('ustalar', 'array-contains', S.profil.id)) : yol('musteriler');
  const sn = await getDocs(q);
  return sn.docs.map(d => ({ id: d.id, ...d.data() })).filter(m => !m.silindi).sort((a, b) => a.ad.localeCompare(b.ad, 'tr'));
}
// Listeden kaldırılmış müşteriyi geri getirir (aynı telefonla yeniden randevu alınınca)
export async function musteriGeriGetir(id) {
  kontrol();
  const b = writeBatch(db);
  b.update(doc(db, 'salons', S.salon.id, 'musteriler', id), { silindi: false, guncelleme: serverTimestamp() });
  await b.commit();
}
// Telefonla tek müşteri (belge adı telefon); yoksa null
export async function musteriGetir(id) {
  kontrol();
  const d = await getDoc(doc(db, 'salons', S.salon.id, 'musteriler', id));
  return d.exists() ? { id: d.id, ...d.data() } : null;
}
// Bir müşterinin randevuları ve (yetkili roller için) ödemeleri
export async function musteriGecmisi(id) {
  kontrol();
  const usta = S.profil.rol === 'usta';
  const ek = usta ? [where('ustalar', 'array-contains', S.profil.id)] : [];
  const rs = await getDocs(query(yol('randevular'), where('musteriId', '==', id), ...ek));
  const randevular = rs.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => b.tarih.localeCompare(a.tarih) || b.bas - a.bas);
  let odemeler = [];
  if (!usta) odemeler = (await getDocs(query(yol('odemeler'), where('musteriId', '==', id)))).docs.map(d => ({ id: d.id, ...d.data() }));
  return { randevular, odemeler };
}


// Ustanın kendi kazanç satırları (başkasının tutarı içermez). Hesap fonksiyonlarının beklediği "ödeme" biçimine çevrilir.
export async function ustaSatirlariniYukle(donem, uid) {
  kontrol();
  const sn = await getDocs(query(yol('ustaSatirlari'), where('donem', '==', donem), where('ustaUid', '==', uid)));
  return liste(sn).map(x => ({
    id: x.id, durum: x.durum, tarih: x.tarih, donem: x.donem, yontem: x.yontem, komisyonOrani: x.komisyonOrani, musteriAd: x.musteriAd,
    kalemler: [{ ustaUid: x.ustaUid, ad: x.ad, tutar: x.tutar, alis: x.alis || 0, tur: x.tur }]
  })).sort((a, b) => a.tarih.localeCompare(b.tarih));
}
// Ustanın bir günkü satırları (dönemden bağımsız: kapanmış dönemdeki günler için de mutabakat yapılabilsin)
export async function ustaGunSatirlariniYukle(tarih, uid) {
  kontrol();
  const sn = await getDocs(query(yol('ustaSatirlari'), where('tarih', '==', tarih), where('ustaUid', '==', uid)));
  return liste(sn).map(x => ({
    id: x.id, durum: x.durum, tarih: x.tarih, donem: x.donem, yontem: x.yontem, komisyonOrani: x.komisyonOrani, musteriAd: x.musteriAd,
    kalemler: [{ ustaUid: x.ustaUid, ad: x.ad, tutar: x.tutar, alis: x.alis || 0, tur: x.tur }]
  }));
}
// Bir ödemenin satır belgeleri (iptal için; yönetici/kıdemli)
export async function odemeSatirlariniYukle(odemeId) {
  kontrol();
  return liste(await getDocs(query(yol('ustaSatirlari'), where('odemeId', '==', odemeId))));
}

// ---- İşlem kayıtları (formül / not) ----
// Usta yalnız kendi kayıtlarını okur; sekreter okuyamaz (kurallar). Çağıran role bakmalı.
export async function islemleriYukle(alan, deger) {
  kontrol();
  const ek = S.profil.rol === 'usta' ? [where('ustaUid', '==', S.profil.id)] : [];
  const sn = await getDocs(query(yol('islemler'), where(alan, '==', deger), ...ek));
  return liste(sn);
}
// Bakım: bir dönemin tüm usta satırı belgeleri (yalnız yönetici/kıdemli/ortak)
export async function donemUstaSatirBelgeleriniYukle(donem) {
  kontrol();
  return liste(await getDocs(query(yol('ustaSatirlari'), where('donem', '==', donem))));
}
// Bakım: usta alanı olmayan eski randevular
export async function eskiRandevulariYukle() {
  kontrol();
  const sn = await getDocs(yol('randevular'));
  return sn.docs.map(d => ({ id: d.id, ...d.data() })).filter(r => !Array.isArray(r.ustalar));
}

// Bakım: müşteri defterini randevulardan tamamlamak için tüm randevular
export async function tumRandevulariYukle() {
  kontrol();
  const sn = await getDocs(yol('randevular'));
  return sn.docs.map(d => ({ id: d.id, ...d.data() }));
}

// ---- Stok (6. teslim) ----
// Ürün kartları + (yetkisi olana) fiyatları. Fiyat okunamazsa (usta) alis/satis boş kalır.
export async function urunleriYukle() {
  kontrol();
  const [us, fs] = await Promise.all([getDocs(yol('urunler')), getDocs(yol('urunFiyat')).catch(() => null)]);
  const f = {}; if (fs) fs.docs.forEach(d => { f[d.id] = d.data(); });
  return us.docs.map(d => ({ id: d.id, ...d.data(), alis: f[d.id] ? f[d.id].alis : null, satis: f[d.id] ? f[d.id].satis : null }))
    .sort((a, b) => a.ad.localeCompare(b.ad, 'tr'));
}
export async function stokAyariYukle() {
  kontrol();
  const d = await getDoc(doc(db, 'salons', S.salon.id, 'ayarlar', 'stok'));
  return d.exists() ? d.data() : { sonSayim: '', tedarikciTel: '' };
}

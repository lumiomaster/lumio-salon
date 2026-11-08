// Salon verilerinin yüklenmesi ve önbelleği. Ekranlar buradan okur, değişiklikten sonra zorla yeniler.
import { S } from './durum.js';
import { db, doc, getDoc, getDocs, collection, query, where } from './fb.js';

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
  const [a, b] = await Promise.all([getDocs(yol('ustalar')), getDocs(yol('ustaMali'))]);
  V.ustalar = {}; a.docs.forEach(d => { V.ustalar[d.id] = d.data(); });
  V.ustaMali = {}; b.docs.forEach(d => { V.ustaMali[d.id] = d.data(); });
  return { profil: V.ustalar, mali: V.ustaMali };
}

// Ekipte kişi eklenince ya da değişince çağrılır
export function uyelerGecersiz() { V.uyeler = null; }

export function veriSifirla() { Object.assign(V, { salonId: null, hizmetler: null, ustalar: null, ustaMali: null, ayar: undefined, uyeler: null }); }

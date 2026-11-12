// Rol kuralları tek yerde. firestore.rules ile AYNI olmalı (güvenliği asıl sağlayan kurallar dosyasıdır,
// buradaki kontroller yalnızca ekranda doğru düğmeleri göstermek içindir).
// Yönetici, kıdemli ve ortak aynı haklara sahiptir. Tek fark: yöneticinin rolünü kimse değiştiremez, yönetici herkesinkini değiştirir.
export const YETKILI = ['yonetici', 'kidemli', 'ortak'];
export const GOREN = ['yonetici', 'kidemli', 'ortak'];

export function yetkiliMi(rol) { return YETKILI.includes(rol); }
export function gorenMi(rol) { return GOREN.includes(rol); }

// Bu rol hangi rollerde kişi ekleyebilir?
export function eklenebilirRoller(rol) {
  return yetkiliMi(rol) ? ['kidemli', 'ortak', 'sekreter', 'usta'] : [];
}

// "ben" rolündeki kişi "hedef" rolündeki kişiyi yönetebilir mi (pasif yap, rol değiştir)?
export function yonetebilir(ben, hedef) {
  if (hedef === 'yonetici') return false;
  return yetkiliMi(ben);
}

// Sekmeler: hangi rol hangi sekmeyi görür
export const SEKMELER = [
  { id: 'ana', ad: 'Ana sayfa', ikon: '🏠', roller: ['yonetici', 'kidemli', 'ortak', 'sekreter', 'usta'] },
  { id: 'takvim', ad: 'Takvim', ikon: '📅', roller: ['yonetici', 'kidemli', 'ortak', 'sekreter', 'usta'] },
  { id: 'kasa', ad: 'Kasa', ikon: '💰', roller: ['yonetici', 'kidemli', 'ortak', 'sekreter', 'usta'] },
  { id: 'musteri', ad: 'Müşteriler', ikon: '📒', roller: ['yonetici', 'kidemli', 'ortak', 'sekreter', 'usta'] },
  { id: 'ekip', ad: 'Ekip', ikon: '👥', roller: ['yonetici', 'kidemli', 'ortak'] },
  { id: 'salon', ad: 'Salon', ikon: '💈', roller: ['yonetici', 'kidemli', 'ortak'] },
  { id: 'ayarlar', ad: 'Ayarlar', ikon: '⚙️', roller: ['yonetici', 'kidemli', 'ortak', 'sekreter', 'usta'] }
];
// Platform yöneticisi aynı zamanda bir salonun üyesiyse alt menüye "Yönetici" sekmesi eklenir
const YONETICI_SEKME = { id: 'yonetici', ad: 'Yönetici', ikon: '🛡️', roller: [] };
export function sekmelerim(rol, yonetici) { return SEKMELER.filter(s => s.roller.includes(rol)).concat(yonetici ? [YONETICI_SEKME] : []); }

// Randevu alabilen, değiştirebilen ve iptal edebilen roller
export const RANDEVU_YAZAR = ['yonetici', 'kidemli', 'ortak', 'sekreter', 'usta'];
export function randevuYazarMi(rol) { return RANDEVU_YAZAR.includes(rol); }

// Ödeme alabilenler (usta ödeme almaz)
export const ODEME_YAZAR = ['yonetici', 'kidemli', 'ortak', 'sekreter'];
export function odemeYazarMi(rol) { return ODEME_YAZAR.includes(rol); }

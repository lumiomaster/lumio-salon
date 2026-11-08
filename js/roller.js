// Rol kuralları tek yerde. firestore.rules ile AYNI olmalı (güvenliği asıl sağlayan kurallar dosyasıdır,
// buradaki kontroller yalnızca ekranda doğru düğmeleri göstermek içindir).
export const YETKILI = ['yonetici', 'kidemli'];
export const GOREN = ['yonetici', 'kidemli', 'ortak'];

export function yetkiliMi(rol) { return YETKILI.includes(rol); }
export function gorenMi(rol) { return GOREN.includes(rol); }

// Bu rol hangi rollerde kişi ekleyebilir?
export function eklenebilirRoller(rol) {
  if (rol === 'yonetici') return ['kidemli', 'ortak', 'sekreter', 'usta'];
  if (rol === 'kidemli') return ['ortak', 'sekreter', 'usta'];
  return [];
}

// "ben" rolündeki kişi "hedef" rolündeki kişiyi yönetebilir mi (pasif yap, rol değiştir)?
export function yonetebilir(ben, hedef) {
  if (hedef === 'yonetici') return false;
  if (hedef === 'kidemli') return ben === 'yonetici';
  return yetkiliMi(ben);
}

// Sekmeler: hangi rol hangi sekmeyi görür
export const SEKMELER = [
  { id: 'ana', ad: 'Ana sayfa', ikon: '🏠', roller: ['yonetici', 'kidemli', 'ortak', 'sekreter', 'usta'] },
  { id: 'takvim', ad: 'Takvim', ikon: '📅', roller: ['yonetici', 'kidemli', 'ortak', 'sekreter', 'usta'] },
  { id: 'ekip', ad: 'Ekip', ikon: '👥', roller: ['yonetici', 'kidemli', 'ortak'] },
  { id: 'salon', ad: 'Salon', ikon: '💈', roller: ['yonetici', 'kidemli', 'ortak'] },
  { id: 'ayarlar', ad: 'Ayarlar', ikon: '⚙️', roller: ['yonetici', 'kidemli', 'ortak', 'sekreter', 'usta'] }
];
export function sekmelerim(rol) { return SEKMELER.filter(s => s.roller.includes(rol)); }

// Randevu alabilen, değiştirebilen ve iptal edebilen roller (ortak yalnız görür)
export const RANDEVU_YAZAR = ['yonetici', 'kidemli', 'sekreter', 'usta'];
export function randevuYazarMi(rol) { return RANDEVU_YAZAR.includes(rol); }

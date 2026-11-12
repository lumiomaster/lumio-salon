// LUMIO SALON - ayarlar (ad, logo ve bağlantılar tek yerden değişir)
export const UYGULAMA = {
  ad: 'LUMIO SALON',
  surum: '1.5.0 (15. teslim)',
  logo: 'icons/logo.png'
};

export const FIREBASE_CONFIG = {
  apiKey: 'AIzaSyCEZQxpG3410fHnF1VWClNmi8xe2NzSXko',
  authDomain: 'lumio-salon-d7c1e.firebaseapp.com',
  projectId: 'lumio-salon-d7c1e',
  storageBucket: 'lumio-salon-d7c1e.firebasestorage.app',
  messagingSenderId: '1073678392913',
  appId: '1:1073678392913:web:8612389611b15e88716270'
};

// Telefon numarasından sahte bir e-posta üretilir (giriş: telefon + şifre).
export const ALIAS_ALAN = 'uye.lumiosalon.app';

export const DENEME_GUN = 14;          // Yalnız bitisMs'i olmayan ESKİ deneme salonları için (firestore.rules içindeki 14 ile aynı); yenilerinde süreyi yönetici paneli belirler
export const DESTEK_TEL = '905354049392';   // Lisans yenileme için salonların WhatsApp'tan yazacağı destek numarası (90 ile başlayan, boşluksuz)
export const YASAL_SURUM = 'v4';  // yasal metinler değişince artırın
// Yasal metinlerde görünen sağlayıcı bilgileri
export const SIRKET = { unvan: 'LUMIO SALON', iletisim: 'WhatsApp +90 535 404 93 92', saklamaAy: 12 };

export const ROLLER = {
  yonetici: 'Yönetici',
  kidemli: 'Kıdemli yetkili',
  ortak: 'Ortak',
  sekreter: 'Sekreter',
  usta: 'Usta'
};

// Cloudflare Worker (bildirim + yapay zekâ danışman). Worker kurulunca url ve vapid doldurulur; boşsa bu özellikler kapalı görünür.
export const SUNUCU = {
  url: 'https://lumio-salon-ai.lumiomaster.workers.dev',
  vapid: 'BHLpdL3eM-bWAA0Uy3JAKmPxJy-V2sOgBLc2sYzpZTH2WzGI7iLXtWnqg-uYtaS77J_-Ao6PtkE-PsCv5awR31w'   // VAPID_PUBLIC (herkese açık anahtar)
};

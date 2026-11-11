// LUMIO SALON - ayarlar (ad, logo ve bağlantılar tek yerden değişir)
export const UYGULAMA = {
  ad: 'LUMIO SALON',
  surum: '0.8.0 (8. teslim)',
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

export const DENEME_GUN = 14;          // firestore.rules içindeki 14 ile aynı olmalı
export const YASAL_SURUM = 'taslak-2';  // avukat onaylı metinler eklenince değişecek

export const ROLLER = {
  yonetici: 'Yönetici',
  kidemli: 'Kıdemli yetkili',
  ortak: 'Ortak',
  sekreter: 'Sekreter',
  usta: 'Usta'
};

// Cloudflare Worker (bildirim + yapay zekâ danışman). Worker kurulunca url ve vapid doldurulur; boşsa bu özellikler kapalı görünür.
export const SUNUCU = {
  url: '',     // örn. 'https://lumio-salon-ai.KULLANICI.workers.dev'
  vapid: ''    // VAPID_PUBLIC değeri (herkese açık anahtar)
};

// LUMIO SALON - ayarlar (ad, logo ve bağlantılar tek yerden değişir)
export const UYGULAMA = {
  ad: 'LUMIO SALON',
  surum: '1.7.0 (17. teslim)',
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
export const YASAL_SURUM = 'v6';  // yasal metinler değişince artırın
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

// ---------- Abonelik fiyatları (KDV HARİÇ, aylık) ----------
// Kademe: aktif ekip üyesi sayısına göre. Yalnız para birimi TRY olan salonlarda ekrandan ödeme akışı açılır;
// diğer ülkelerde fiyat belirlenene kadar WhatsApp ile iletişim gösterilir. Rakamları buradan değiştirin.
export const FIYAT = {
  para: 'TRY',
  kdv: 20,                                   // % (müşteriye eklenir)
  kademeler: [{ max: 3, aylik: 1000, ad: '1-3 kişi' }, { max: 10, aylik: 2500, ad: '4-10 kişi' }, { max: 9999, aylik: 3500, ad: '11+ kişi' }],
  ekPaket: { satis: 1250 },                  // "Satış ve analiz" paketi, aylık (DEĞİŞTİRİLECEK: fiyat henüz kesin değil)
  sureler: [{ ay: 1, gun: 30, indirim: 0 }, { ay: 3, gun: 90, indirim: 5 }, { ay: 6, gun: 180, indirim: 10 }, { ay: 12, gun: 365, indirim: 20 }]   // indirim: % (belirlenecek)
};
// Müşterinin para göndereceği hesaplar (ülke koduna göre). Boş bırakılan alanlar ekranda gösterilmez; hiç doluysa yoksa "WhatsApp'tan alın" yazar.
export const ODEME_HESAPLARI = {
  TR: [{ ad: 'Banka havalesi / EFT', alici: '', iban: '' }]
};

// TRY dışındaki para birimleri için fiyatlar DOLAR cinsindendir (aylık, KDV hariç; KDV Türkiye'ye göre FIYAT.kdv kadar üstüne eklenir). Yerel fiyat = dolar x yönetici panelinde girilen kur, yuvarlanarak.
// Kur girilmemiş para biriminde ekrandan ödeme kapalıdır ("WhatsApp ile yaz" görünür). Rakamlar 6 Kasım 2026 kuruyla (1 USD ≈ 50 TL) TL fiyatlarının dolar karşılığıdır.
export const FIYAT_USD = {
  kademeler: [{ max: 3, aylik: 20, ad: '1-3 kişi' }, { max: 10, aylik: 50, ad: '4-10 kişi' }, { max: 9999, aylik: 70, ad: '11+ kişi' }],
  ekPaket: { satis: 25 },
  yuvarla: { KZT: 500 }                       // yerel fiyat bu değerin katına yuvarlanır (varsayılan 1)
};
export const KUR_PARALARI = ['KZT'];         // yönetici panelinde kuru girilebilen paralar
ODEME_HESAPLARI.KZ = [{ ad: 'Kaspi Bank', alici: '', iban: '' }];

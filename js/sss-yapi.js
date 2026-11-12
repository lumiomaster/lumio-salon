// SSS yapısı: madde kimliği, kategori ve hangi rollerin göreceği. Metinler sss-<dil>.js dosyalarında.
// r: tum = herkes, yet = yönetici/kıdemli/ortak, ofis = yetkililer + sekreter, usta = yalnız usta, yetusta = yetkililer + usta
export const KATEGORILER = ['baslangic', 'takvim', 'odeme', 'kasa', 'musteri', 'ekip', 'salon', 'mesaj', 'bildirim', 'lisans'];
export const SSS_YAPI = [
  ['giris', 'baslangic', 'tum'], ['sifre', 'baslangic', 'tum'], ['dil', 'baslangic', 'tum'], ['kurulum', 'baslangic', 'tum'], ['ana', 'baslangic', 'tum'], ['kurulumkart', 'baslangic', 'yet'],
  ['randevu', 'takvim', 'tum'], ['gezin', 'takvim', 'tum'], ['detay', 'takvim', 'tum'], ['duzenle', 'takvim', 'tum'], ['iptal', 'takvim', 'tum'], ['dolu', 'takvim', 'tum'], ['mesai', 'takvim', 'tum'], ['izin', 'takvim', 'yet'], ['asama', 'takvim', 'yet'], ['ilave', 'takvim', 'ofis'], ['formul', 'takvim', 'tum'],
  ['odeme', 'odeme', 'ofis'], ['urunekle', 'odeme', 'ofis'], ['capraz', 'odeme', 'ofis'], ['kart', 'odeme', 'yetusta'], ['odemeiptal', 'odeme', 'ofis'], ['odenmemis', 'odeme', 'ofis'], ['sadakatuygula', 'odeme', 'ofis'],
  ['gunkasa', 'kasa', 'ofis'], ['ustahesap', 'kasa', 'yet'], ['avans', 'kasa', 'yet'], ['donem', 'kasa', 'yet'], ['kar', 'kasa', 'yet'], ['kazancim', 'kasa', 'usta'], ['mutusta', 'kasa', 'usta'], ['mutyon', 'kasa', 'yet'], ['hedefyon', 'kasa', 'yet'], ['hedefusta', 'kasa', 'usta'],
  ['musteriekle', 'musteri', 'tum'], ['musteridetay', 'musteri', 'tum'], ['geri', 'musteri', 'ofis'], ['dogum', 'musteri', 'ofis'], ['rehber', 'musteri', 'yet'], ['ustamusteri', 'musteri', 'usta'],
  ['kisiekle', 'ekip', 'yet'], ['roller', 'ekip', 'yet'], ['sifresifirla', 'ekip', 'yet'], ['ekipsil', 'ekip', 'yet'], ['sohbet', 'ekip', 'tum'],
  ['genel', 'salon', 'yet'], ['hizmet', 'salon', 'yet'], ['oran', 'salon', 'yet'], ['ustaayar', 'salon', 'yet'], ['stok', 'salon', 'yet'], ['malkabul', 'salon', 'yet'], ['sayim', 'salon', 'yet'], ['azalan', 'salon', 'yet'], ['sadakat', 'salon', 'yet'],
  ['mesajgonder', 'mesaj', 'ofis'], ['sablon', 'mesaj', 'yet'], ['mesajdil', 'mesaj', 'ofis'], ['yarin', 'mesaj', 'ofis'],
  ['bildirimac', 'bildirim', 'tum'], ['bildirimyok', 'bildirim', 'tum'],
  ['lisans', 'lisans', 'yet'], ['yasal', 'lisans', 'tum'], ['danisman', 'lisans', 'tum']
].map(([id, k, r]) => ({ id, k, r }));
export const SSS_ROL = { tum: ['yonetici', 'kidemli', 'ortak', 'sekreter', 'usta'], yet: ['yonetici', 'kidemli', 'ortak'], ofis: ['yonetici', 'kidemli', 'ortak', 'sekreter'], usta: ['usta'], yetusta: ['yonetici', 'kidemli', 'ortak', 'usta'] };

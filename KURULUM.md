# LUMIO SALON – 2. Teslim (Salon ayarları)

Bu teslimde yeni olanlar: **Salon** sekmesi (yönetici, kıdemli yetkili, ortak görür) ve içinde üç bölüm:

- **Genel:** kart (POS) komisyon oranı, takvimde randevu adımı, salon telefonu.
- **Hizmetler:** hizmet adı, grup, fiyat, süre. Boya gibi **aşamalı** hizmetler (sür – bekle – durula) ve "bekleme" aşamasında ustanın başka işe bakabilmesi. Boş salon için hazır paketler (kadın kuaförü, erkek berberi, tırnak ve güzellik).
- **Ustalar:** her ustanın yaptığı hizmetler, **gün gün çalışma saatleri** (Cumartesi kısa olabilir, kapalı gün = haftalık izin), **planlı izinler** (tarih aralığı), **usta yüzdesi** ve **ürün satışı primi**. Yönetici, kıdemli yetkili ve ortak da salonda çalışıyorsa "randevu alıyor" diye işaretlenebilir.

Ana sayfada yönetici ve kıdemli yetkili için **Salon kurulumu** listesi çıkar; eksik adımları gösterir.

Usta yüzdesi ayrı bir belgede tutulur: yalnızca yönetici, kıdemli yetkili, ortak ve ustanın kendisi görür. Maliyet ve kâr zaten sonraki tesliminde aynı korumayla gelecek.

## A. Dosyaları GitHub'a yükle (üzerine yazılır)

1. Zip'i bilgisayarda **ayıkla** (sağ tık > Tümünü ayıkla).
2. https://github.com/lumiomaster/lumio-salon > **Add file > Upload files**.
3. Ayıkladığın klasörün içindeki **her şeyi** sürükle (css, icons, js klasörleri ve dosyalar). Aynı isimli dosyalar yenisiyle değişir.
4. **Commit changes** de. 1–2 dakika bekle.
5. Uygulamayı açınca eski ekran görünürse sayfayı **Ctrl+Shift+R** ile yenile. Telefonda: tarayıcıyı kapatıp aç ya da ana ekran simgesini silip yeniden ekle.

## B. Kuralları yenile (YENİ KURALLAR VAR, mutlaka yap)

1. Firebase > **Firestore Database > Rules**.
2. Kutudaki her şeyi sil, yeni `firestore.rules` dosyasının **tamamını** yapıştır, **Publish** de.

## C. Test listesi

1. **Salon > Genel:** Kart komisyonuna `2,5` yaz, adım 15 dk, **Kaydet**. "Kaydedildi" çıkmalı. `25` yazarsan hata vermeli (en çok 20).
2. **Salon > Hizmetler:** "Hızlı başla" altından **Kadın kuaförü** paketini ekle. 8 hizmet gelmeli, hepsinde "Fiyat girin" uyarısı olmalı.
3. **Dip boya > Düzenle:** 3 aşama görünmeli (boyayı sür, bekleme, durula). Toplam süre 90 dk olmalı. Fiyat yaz (örn. 1500), **Kaydet**. Listede fiyat görünmeli.
4. **+ Hizmet:** Kendi hizmetini ekle (aşamasız), süreyi 3 dakika yazınca hata vermeli, 20 yazınca eklenmeli.
5. **Salon > Ustalar:** Bir ustayı **Ayarla**: hizmetlerini işaretle, **Cumartesi** bitişini 15:00 yap, **Pazar** kapalı kalsın, bir **izin** ekle (başlangıç ve bitiş tarihi), usta yüzdesini `40`, ürün primini `10` yaz, **Kaydet**.
6. **Ana sayfa:** "Salon kurulumu" listesindeki adımlar tek tek ✓ olmalı. Hepsi bitince liste kaybolur.
7. **Ortak ile giriş:** Ekip'ten bir ortak ekle, onunla (başka tarayıcıda) gir. Salon sekmesini görmeli ama **Kaydet** düğmesi olmamalı, "Ayarla" yerine "Gör" yazmalı. Usta yüzdesini görebilmeli.
8. **Usta ile giriş:** Ustada **Salon sekmesi olmamalı**.
9. **Sekreter ile giriş:** Sekreterde de Salon sekmesi olmamalı.
10. **Firebase'de bak:** `salons > (salonun) >` altında `ayarlar`, `hizmetler`, `ustalar`, `ustaMali` koleksiyonları olmalı. Usta yüzdesi `ustaMali` içinde, `ustalar` içinde değil.

## D. Bir şey çalışmazsa

Ekran görüntüsü + ne yaptığın + mümkünse F12 > Console'daki kırmızı yazılar.

## E. Dürüst notlar

- Kuralların yeni bölümlerini yine gerçek Firebase'de deneyemiyorum; ekran akışını sahte bir Firebase ile denedim (hepsi geçti). Gerçek denemede küçük düzeltme çıkabilir. Özellikle "Kaydet" dediğinde kırmızı **"yetkiniz yok"** çıkarsa haber ver.
- Sekreter için ayrı bir ekran henüz yok; takvim geldiğinde (3. teslim) görecek.
- Saat alanları telefonunun dil ayarına göre 24 saat ya da AM/PM görünür.

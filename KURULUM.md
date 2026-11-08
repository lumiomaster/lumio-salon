# LUMIO SALON – 3. Teslim (Takvim ve randevu)

Yeni: alttaki menüde **Takvim** (herkes görür). İçinde:

- **Gün görünümü:** tarih okları, usta filtresi, o gün izinde olan ustalar.
- **+ Randevu:** müşteri adı/telefon, tarih, saat, **birden fazla hizmet** (kalem). Her hizmet için uygun usta **otomatik önerilir** (o gün en az dolu olan). Seçenekte "müsait / dolu / izinli / mesai dışı" yazar; dolu ve izinli seçilemez.
- **Çakışma kilidi:** bir ustanın aynı saati iki kişiye verilemez. Kilit sunucuda olduğu için iki sekreter aynı anda denese bile biri reddedilir ("bu saat az önce başka randevuya verildi").
- **Aşamalı hizmet (boya):** yalnız "usta çalışıyor" aşamaları kilitlenir; bekleme sırasında usta başka müşteriye bakabilir.
- **İptal:** saat hemen boşalır. **Düzenle / ertele:** saat, gün, usta, hizmet değişir.
- **İzin uyarısı:** bir ustaya izin eklenince o tarihte randevusu olan müşteriler listelenir ("müşteriyi arayın"). Takvimin üstünde de önümüzdeki 30 gün için "aranacak" kartı çıkar; Ara ve Ertele düğmeleri var.

Randevu alabilen/iptal edebilen: yönetici, kıdemli yetkili, sekreter, usta. Ortak yalnız görür.

## A. GitHub'a yükle
1. Zip'i **ayıkla**. 2. GitHub > **Add file > Upload files** > ayıkladığın klasörün içindeki **her şeyi** sürükle. 3. **Commit changes**, 1–2 dk bekle. 4. **Ctrl+Shift+R**. (Yeni dosyalar: `js/ekranlar/takvim.js`, `js/takvim-mantik.js`; 12 dosya değişti/eklendi.)

## B. Kuralları yenile (YENİ KURALLAR VAR, mutlaka yap)
Firebase > Firestore Database > **Rules** > her şeyi sil, yeni `firestore.rules` dosyasının tamamını yapıştır > **Publish**. Hata verirse ekran görüntüsünü gönder.

## C. Test listesi
Önce Salon > Ustalar'da en az **iki ustanın** hizmetlerini ve çalışma saatlerini ayarla (Teslim 2'dekiler yeterli).

1. **Takvim > + Randevu:** bir müşteri, yarın 10:00, "Saç kesimi". Usta otomatik gelmeli, kaydedince kart görünmeli (10:00–10:45).
2. **Aynı saate ikinci randevu:** ilk usta "dolu" yazmalı, ikincisi önerilmeli.
3. **Üçüncü randevu aynı saatte:** "uygun usta yok" uyarısı çıkmalı, kaydetmemeli.
4. **Çakışma kilidi (en önemli):** iki farklı cihazdan (ya da iki tarayıcıdan) aynı ustaya aynı saati **aynı anda** vermeyi dene. Biri "az önce başka randevuya verildi" demeli. Firebase'de `slotlar` koleksiyonunda her 5 dakika için bir belge olmalı.
5. **Çok kalemli:** "Dip boya" 14:00 + **+ Hizmet ekle** "Fön". Fön'ün başlangıcını 14:30'a çek: aynı usta olabilmeli (bekleme sırası). 15:00'e çekersen (usta meşgul) "dolu" demeli.
6. **İptal:** bir randevuya dokun > **İptal et**. Liste dışına çıkmalı, "İptal edilenleri göster" ile görünmeli, saat tekrar alınabilmeli.
7. **Düzenle / ertele:** başka saate al, kaydet; eski saat boşalmalı.
8. **İzin uyarısı:** randevusu olan ustaya o güne izin ekle (Salon > Ustalar). "Müşterileri arayın" penceresi çıkmalı; Takvim'de randevu turuncu ⚠ ile işaretli olmalı.
9. **Usta ile giriş:** takvimi görmeli, randevu alabilmeli. **Ortak ile giriş:** görür ama + Randevu ve İptal düğmesi yok.
10. **Sekreter ile giriş:** takvimi görür ve randevu alır.

## D. Dürüst notlar
- Kuralları gerçek Firebase'de deneyemiyorum; ekran akışını sahte Firebase ile denedim (hepsi geçti). Kırmızı **"yetkiniz yok"** çıkarsa haber ver; çakışma ile karışmasın diye çakışma mesajı ayrıca gösterilir.
- Aynı ustaya aynı anda iki iş vermeyi kural da engeller; ama sunucu kuralı "bu kilit gerçekten bu randevunun" kontrolünü yapar, her kilidin saatinin doğruluğunu hesaplayamaz. Yani yalnızca salon çalışanları (zaten giriş yapmış) bunu atlatabilir; dışarıdan biri yapamaz.
- Randevu bu teslimde yalnız "bekliyor" ya da "iptal" olur. Ödeme alınca "tamamlandı" olması 4. teslimde (ödeme ve kasa) gelir.
- Müşteri defteri (kayıtlı müşteri listesi) 5. teslimde; şimdilik ad ve telefon her randevuya yazılır.

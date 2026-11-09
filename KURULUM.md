# LUMIO SALON – 5. Teslim (Müşteri defteri + usta gizliliği düzeltmesi)

## Düzeltme: usta başkasının müşterisini ve parasını göremez
- **Takvim:** usta kendi randevularını tam görür. Diğer ustaların randevuları yalnızca **"Dolu"** saat bloğu olarak görünür (yoğunluk), **müşteri adı, hizmet, tutar yok**.
- **Ödemeler:** usta yalnız **kendi satırını** görür (Kasa > Kazancım). Aynı müşterinin başka ustaya ait tutarı ya da ürün satışı ona görünmez. Bu artık Firebase kurallarıyla zorlanıyor, sadece ekranda gizlenmiyor.
- Eski (test) randevu ve ödemeler yeni yapıya uymaz: **eski test randevularını ustalar göremez**, eski test ödemeleri ustanın "Kazancım"ında çıkmaz. Yönetici/kıdemli/sekreter/ortak hepsini görmeye devam eder. Test verisini bu yüzden **yeniden oluşturman** gerekir; gerçek kullanıma geçmeden önce Firebase'deki test verisini silmek en temizi.

## Yeni: Müşteriler sekmesi (herkes görür)
- **Tek ortak defter.** Yönetici, kıdemli, ortak, sekreter hepsini görür. **Usta yalnız hizmet verdiği müşterileri** görür; ustaya yeni randevu alındığında müşteri ona otomatik eklenir.
- Randevu alırken ad yazınca kayıtlı müşteriler çıkar; **telefon yazınca müşteri otomatik bulunur** (aynı telefon iki kez açılmaz).
- Müşteri ayrıntısı: ad, telefon, **not** (alerji, tercih), **randevu geçmişi**, toplam harcama ve ziyaret sayısı (ustaya gösterilmez), **Ara / WhatsApp / Randevu al**.
- **+ Müşteri:** randevusuz müşteri ekleme. Ad ya da telefonla arama.
- **Ayrılan usta listesi** (yalnız yönetici/kıdemli): ustayı seç, ismini ve telefonlarını kopyala ya da CSV indir. İşlem kayıtlara yazılır.

## A. GitHub'a yükle
Zip'i **ayıkla** > GitHub **Add file > Upload files** > ayıkladığın klasörün içindeki **her şeyi** sürükle > **Commit changes** > 1–2 dk bekle > **Ctrl+Shift+R**.

## B. Kuralları yenile (YENİ KURALLAR VAR, mutlaka yap)
Firebase > Firestore Database > **Rules** > her şeyi sil, yeni `firestore.rules`ın tamamını yapıştır > **Publish**.

## C. Test listesi (yeni test verisiyle)
1. **Takvim:** yeni bir randevu al (müşteri adı + **telefon**), bir ustaya. Müşteriler sekmesinde müşteri görünmeli.
2. **Aynı telefonla ikinci randevu** (yalnız telefonu yaz, adı kendisi gelmeli), başka bir ustaya. Müşteri sayısı artmamalı.
3. **Usta olarak giriş (1. usta):** Takvim'de kendi randevusunu tam, diğer ustanınkini "Dolu" olarak görmeli; **ad yazmamalı**. Müşteriler'de yalnız kendi müşterisi olmalı.
4. **Müşteriler > + Müşteri:** ustayla yeni müşteri ekle; kendi listesinde çıkmalı, yönetici de görmeli.
5. **Yönetici:** Müşteriler'de arama (ad ve telefon), ayrıntıda **not** yaz, kaydet; randevu geçmişi görünmeli.
6. **İki ustalı ödeme:** bir randevuda **Ödeme al**, **+ Ürün satışı ekle** ile ikinci ustaya satış yaz. Sonra **1. usta olarak** Kasa > Kazancım: yalnız kendi tutarını (ve payını) görmeli, ürün satışını/toplamı **görmemeli**.
7. **Ödemeyi iptal et** (yönetici): ustanın Kazancım'ından düşmeli.
8. **Müşteriler > Liste hazırla:** bir usta seç, listeyi ver; isim ve telefon çıkmalı.

## D. Dürüst notlar
- Kuralları gerçek Firebase'de deneyemiyorum; ekran akışını sahte Firebase ile denedim (hepsi geçti). "Yetkiniz yok" çıkarsa ekran görüntüsü gönder.
- Usta, telefon numarasını bildiği bir müşterinin yalnızca **kayıtlı olup olmadığını/adını** doğrudan sorabilir (aynı telefonu ikinci kez açmayı engellemek için gerekli); listeyi göremez.
- Ustanın müşteriye ait **notları** ustanın kendi müşterilerinde görünür; başka ustanınkini görmez.
- Müşteri bilgi güncellemesi: telefon bir kez yazıldıktan sonra değiştirilemez (belge adı telefondur); yanlışsa yeni müşteri açılır.
- Müşteri formülleri (boya) ve stok 6. teslimde.

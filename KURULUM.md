
---
## 5. teslim EK paketi (bu zip)
1. **Firebase > Firestore > Rules**: `firestore.rules` içeriğini yapıştırıp **Yayınla** (yeni kurallar var).
2. Siteyi yenileyin (Ctrl+Shift+R / telefonda uygulamayı kapatıp açın).
3. **Salon > Genel > "Eski randevuları yeni düzene çevir"** düğmesine bir kez basın (eski test randevularını ustaların kendi randevusunu görmesi için günceller).
4. Test edin: usta kendi randevusunu açabiliyor mu; başkasınınkini yalnız "Dolu" görüyor mu.
- **Ürün satışı (kâr üzerinden):** kâr = satış − kart komisyonu − alış fiyatı. Usta, kârın ürün primi %'sini alır; kalanı kasaya (salona) kalır. Yüzde, Salon > Ustalar'da usta başına değiştirilir.
- **Müşteri defteri:** doğum günü, sonraki ziyaret, kayıp müşteri (gün sayısı Genel'de), WhatsApp mesajı tek tık, formül/not kaydı, işlem geçmişi, rehber CSV.
- Notlar: mesaj metinleri şimdilik hazır Türkçe; düzenlenebilir hâli 8. teslimde. Formül şimdilik serbest yazı (ürün+gram 6. teslimde). Sekreter formülleri göremez. Eski test ödemelerinde usta satırı olmayabilir.

---
## 5. teslim EK-2 paketi (bu zip)
- **firestore.rules değişmedi** (önceki ek pakette yayınladıysanız tekrar yayınlamayın).
- Siteyi sert yenileyin. Telefondaki uygulamayı tamamen kapatıp açın.
- **Mutabakat:** Mutabakat düğmeleri ustanın "Kazancım" ekranındadır. Eski bir günde (örn. 09.11) düğme yoksa: Salon > Genel > Bakım > **"Eski ödemeleri ustalara yansıt"** düğmesine bir kez basın, sonra usta ekranını yenileyin.
- **İlave hizmet:** Randevuyu açın > "+ İlave hizmet / işlem". Aynı ya da başka usta seçilir, saat elle verilebilir, kaydedince formül/not penceresi açılır. Ödeme tüm hizmetleri tek seferde alır.
- **Randevusuz işlem:** Yeni müşteri formunda "Bu müşteriye işlem yaptım" bölümü; mevcut müşteride "+ İşlem kaydı ekle (randevusuz)".
- **Geri tuşu:** Önce açık pencereyi kapatır, sonra Ana sayfaya döner, Ana sayfada "tekrar basın" uyarısı verir.
- **Doğum günleri:** Ana sayfada ve Müşteriler'de bugün + önümüzdeki 7 gün.
- **WhatsApp:** LUMIO'daki gibi api.whatsapp.com bağlantısı (emojiler bozulmasın diye). Metinler LUMIO ile aynı.

---
## 5. teslim EK-3 paketi
- **firestore.rules DEĞİŞTİ** (müşteri silme/geri getirme): Firebase > Firestore > Rules'a yapıştırıp **Publish** edin. Bu sefer Publish düğmesi çıkmalı.
- Uygulamayı kapatıp açın; Ayarlar'ın altındaki sürüm **0.5.3** olmalı. Değilse geri tuşu düzeltmesi henüz gelmemiştir.
- **Müşteriyi sil:** Müşteri > müşteriyi aç > en altta "Müşteriyi sil" (yalnız yönetici/kıdemli, onay sorar). Uygulamadan kalkar, Firebase'de kayıtlar durur. Aynı telefon tekrar girilirse müşteri geri gelir.
- **Takvimde bekleme aşamalı iş:** diğer ustalar artık tek kart görür (örn. 11:00–13:00 Dolu, "Bekleme arası müsait: 11:40–12:20").
- **Salon > Genel > Bakım > "Takvim kilitlerini kontrol et":** eksik kilit varsa tamamlar.

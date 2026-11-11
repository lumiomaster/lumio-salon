# LUMIO SALON — 8. Teslim (v0.8.0)

## Bu teslimde yeni olanlar
1. **Mesaj şablonları (Ayarlar > Mesaj şablonları):** Müşteriye giden 5 mesaj (doğum günü, sonraki ziyaret, uzun süredir gelmeyen, randevu onayı, yarınki randevu hatırlatma) ve ustaya giden günlük hesap mesajının parçaları (başlık, ürün teşviki, tebrik, alt yazı) ile tedarikçi sipariş mesajı artık **salon tarafından düzenlenebilir**. Değişken düğmeleri (müşteri adı, tarih…) ile ekleme, örnek bilgilerle önizleme, **"Varsayılana dön"** var. Hazır metinler LUMIO'dakiyle aynıdır.
2. **Ana sayfa > Yarınki randevular:** yarın randevusu olan her müşteri için tek tıkla WhatsApp hatırlatması. Gönderilince "Gönderildi · kim, ne zaman" yazar; ikinci kez göndermeden önce uyarır.
3. **Yasal metinler (taslak):** Kayıt ekranında ve Ayarlar'da kullanım şartları + gizlilik/KVKK; yetkililer için **müşteri aydınlatma metni şablonu** (salon adı otomatik yazılır). **Hepsi TASLAKTIR, yayından önce avukat onayı gerekir.**
4. **Bildirimler (Ayarlar > Bildirimler):** yeni randevu (ustaya), ekip sohbeti (herkese), hesaba itiraz (yetkililere) telefona bildirim olarak gelir. **Cloudflare Worker kurulunca çalışır** (aşağıda C).
5. **Usta Danışman (Ana sayfa):** sektör ağzıyla konuşan, uygulamayı bilen yapay zekâ meslektaş. Yetkililere salonun bu ayki rakamlarını da bilerek cevap verir; usta/sekreter mali bilgi göremez. **Worker kurulunca çalışır.**

## A. GitHub'a yükle
Zip'i **ayıkla** > GitHub **Add file > Upload files** > ayıkladığın klasörün içindeki **her şeyi** sürükle > **Commit changes** > 1–2 dk bekle > **Ctrl+Shift+R**.

## B. Kuralları yenile (YENİ KURALLAR VAR, mutlaka yap)
Firebase > Firestore Database > **Rules** > her şeyi sil, yeni `firestore.rules`ın tamamını yapıştır > **Publish**.
(Eklenenler: `ayarlar/mesajlar` şablon belgesi ve `hatirlatma` mesaj türü.)

## C. Bildirim + Yapay zekâ için Worker kurulumu
Ayrı pakette (**lumio-salon-worker-8.zip**): adım adım **KURULUM-WORKER.md**. O paketteki dosyalar GitHub'a YÜKLENMEZ (içinde gizli anahtar var). Kurulmazsa uygulamanın geri kalanı aynen çalışır; sadece Bildirim ve Danışman "henüz kurulmadı" görünür.

## D. Test listesi
1. **Ayarlar > Mesaj şablonları:** "Yarınki randevu hatırlatma"yı aç, bir cümleyi değiştir, Kaydet. Önizleme değişmeli; "Düzenlendi" yazmalı. **Varsayılana dön** ile eski haline gelmeli.
2. **Usta günlük hesap: başlık** şablonunu değiştirip bir ustaya hesap mesajı hazırla (Kasa > Hesap): yeni başlık görünmeli.
3. **Yarın için randevu al**, Ana sayfada "Yarınki randevular" kartında WhatsApp'a bas: mesaj açılmalı, sonra "✓ Gönderildi · …" yazmalı. Başka biri (başka telefon) aynı butona basınca uyarı çıkmalı.
4. **Kayıt ekranı** (çıkış yapıp "Salon kur"): Kullanım şartları ve Gizlilik/KVKK bağlantıları açılmalı, üstte "TASLAK" uyarısı olmalı.
5. **Ayarlar > Müşteri aydınlatma şablonu:** salon adın yazmalı.
6. (Worker kurulduysa) Ayarlar > **Bildirimleri aç**; başka telefonla randevu aldır / sohbete yaz: bildirim gelmeli. Ana > **Danışmanla konuş**.

## E. Dürüst notlar
- Bildirim ve Danışman'ı gerçek Cloudflare/Anthropic hesabıyla deneyemedim; Worker'ın şifreleme, imza ve yetki mantığını yerelde sahte servislerle test ettim (hepsi geçti). İlk gerçek denemede sorun çıkarsa ekran görüntüsü gönder.
- **iPhone'da** bildirim için uygulamanın ana ekrana eklenmiş olması gerekir (Safari > Paylaş > Ana Ekrana Ekle). Android'de doğrudan çalışır.
- Müşteriye hatırlatma/onay mesajları yine **kendi WhatsApp'ınızdan tek tıkla** gider (otomatik WhatsApp Business gönderimi yok). Doğum günü/kampanya gibi **ticari mesajlar için müşteriden izin** gerekebilir (avukata danışın).
- Mesaj şablonları değişince eskiden gönderilmiş mesajlar etkilenmez.
- Yapay zekâ cevapları yol göstericidir; sağlık, hukuk, vergi konularında uzmana yönlendirir. Günlük kullanım sınırı vardır (kişi başı 25, salon başı 60 soru; Worker'dan değiştirilir).

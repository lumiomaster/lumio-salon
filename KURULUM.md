# LUMIO SALON — 9. Teslim (v0.9.1)

## Bu teslimde yeni olanlar
1. **Oran grupları:** Ustanın yüzdesi artık işleme göre değişebilir. Örn. *boya işlemlerinden %40, malzemesiz işlemlerden %50*. **Salon > Hizmetler > "Oran grupları"** ile grup ekleyin ("Malzemeli işlem" hazır gelir, en fazla 8 grup). Her hizmete **"Usta oran grubu"** seçin. **Salon > Ustalar**'da her ustaya grup başına yüzde yazın; boş bırakılırsa "Genel" yüzde uygulanır. Ürün satışı primi eskisi gibi ayrı çalışır. Eski ödemeler değişmez.
2. **Mal kabul / fatura > "＋ Yeni ürün ekle":** Stokta olmayan ürün alırken ürünü oradan açıp aynı ekranda faturaya eklersiniz.
3. **Çapraz satış primi:** Ödeme alırken **"+ Hizmet ekle"** ile eklenen hizmette **"Hizmeti satan usta"** seçilir (varsayılan: randevudaki usta). Satan başka ustaysa, komisyon sonrası tutarın **%5'i** ona prim olur (oran ayarlanır). Prim salonun payından ödenir; ustanın Kazancım ve Hesap ekranında ayrı satır olarak görünür.
4. **Aylık hedefler (kota):** **Salon > Genel > "Çapraz satış ve hedefler"**: çapraz satış % ve hedefler. Hedef = ölçü (ürün satışı cirosu ya da çapraz satış tutarı) + eşik + ödül (sabit ₺ ya da ek yüzde). Aynı ölçüde ulaşılan **en yüksek** basamak geçerlidir.
5. **İkramiye:** **Kasa > Hesap** üstünde geçen ayın hedef ikramiyeleri görünür; **"Hesaba ekle"** deyince ustanın bu dönem hesabına eklenir (aynı ay için bir kez). **Kasa > Kâr**'da gider olarak düşülür.
6. **Ana sayfa:** Usta kendi aylık ilerlemesini ve "hedefe şu kadar kaldı"yı görür. Yönetici/kıdemli/ortak "en çok ürün satan" ve "en çok çapraz satış yapan" sıralamasını görür.
7. **Yeni müşteri mesajları (LUMIO'daki eksikler):** Google puanlama isteği, memnuniyet mesajı, Instagram daveti, IBAN/transfer bilgisi. **Salon > Genel > "Mesajlarda kullanılan bağlantılar"** bölümüne Instagram, Google puanlama linki ve banka bilgisini yazın. Müşteri kartında **"Mesaj gönder"** düğmesi bu mesajları (ve "sizi özledik"i) tek tıkla WhatsApp'a açar, gönderim kaydedilir. Metinler Ayarlar > Mesaj şablonları'ndan düzenlenir.
8. **Randevu detayı:** alt düğmeler düzenlendi (Ödeme al tam genişlik; İptal et / Düzenle eşit).

## A. GitHub'a yükle
Zip'i **ayıkla** > GitHub **Add file > Upload files** > ayıkladığın klasörün içindeki **her şeyi** sürükle > **Commit changes** > yeşil tik çıkana kadar bekle > **Ctrl+Shift+R**. (Ayarlar'da sürüm **0.9.0** yazmalı.)

## B. Kuralları yenile (YENİ KURALLAR VAR, mutlaka yap)
Firebase > Firestore Database > **Rules** > her şeyi sil, yeni `firestore.rules`ın tamamını yapıştır > **Publish**.
(Eklenenler: hizmette oran grubu, ustada grup yüzdeleri, çapraz satış satırları, `ayarlar/oranlar`, `ikramiyeler`, genel ayarda Instagram/Google/IBAN alanları, 4 yeni mesaj şablonu.)

## C. Test listesi
1. **Hizmetler > Oran grupları:** "Malzemeli işlem" görünmeli. Bir boya hizmetini bu gruba al.
2. **Ustalar:** bir ustaya Genel %50, Malzemeli %40 yaz. O ustaya boya ve normal hizmetli iki randevu, ödeme al: Kasa > Hesap'ta pay boyadan %40, diğerinden %50 hesaplanmalı.
3. **Çapraz satış:** Mehmet'in randevusunda ödeme al > "+ Hizmet ekle" > hizmeti seç > "Hizmeti satan usta"yı Zeynep yap > öde. Hesap'ta Zeynep'te "Çapraz satış primi" çıkmalı; Zeynep'in telefonunda Kasa > Kazancım'da da görünmeli.
4. **Genel > Çapraz satış ve hedefler:** 2 hedef ekle (örn. ürün 1000 ₺ → 200 ₺; çapraz 100 ₺ → %10). Kaydet. Ana sayfada sıralama kartı ve ustada ilerleme kartı görünmeli.
5. **Mal kabul > ürün seçimi > "＋ Yeni ürün ekle":** ürünü aç, faturaya eklenmeli.
6. **Randevuya dokun:** alt düğmeler düzgün sıralı olmalı.
7. **Salon > Genel**'e Instagram, Google linki, IBAN yaz > Kaydet. Bir müşteri kartı > **Mesaj gönder** > Google puanlama: WhatsApp'ta link görünmeli. Link yazılmamışsa düğme "Önce Salon > Genel…" uyarısı vermeli.
8. Ay sonunda **Kasa > Hesap > hedef ikramiyeleri > Hesaba ekle**; Kâr'da "Hedef ikramiyeleri" satırı görünmeli.

## D. Dürüst notlar
- İkramiye, ay bittikten sonra (yeni ayın başından itibaren) hesaba eklenir; içinde bulunulan ay için ustalar ilerlemeyi Ana sayfada görür.
- Çapraz satış primi yalnızca ödeme sırasındaki **"+ Hizmet ekle"** ile eklenen hizmetlerde hesaplanır.
- Usta yüzdeleri hesap anındaki ayara göre hesaplanır (önceki teslimlerdeki gibi); çapraz satış oranı ise ödeme anındaki değeriyle kaydedilir.
- Worker (bildirim ve Usta Danışman) kurulumu önceki pakette anlatıldığı gibidir.

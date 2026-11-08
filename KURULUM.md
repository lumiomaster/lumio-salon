# LUMIO SALON – 1. Teslim Kurulum ve Test

Bu teslimde olanlar: salon kurma, telefon + şifre ile giriş, 5 rol (yönetici, kıdemli yetkili, ortak, sekreter, usta), ekip yönetimi (kişi ekleme, rol değiştirme, pasif yapma), deneme süresi (14 gün), işlem kayıtları ve güvenlik kuralları.
Takvim, kasa, stok vb. sonraki tesliminde gelecek; ana sayfada "Yakında" olarak görünür.

## A. Dosyaları GitHub'a yükle (bilgisayardan yapman en kolayı)

1. Gelen zip dosyasını bilgisayarda **aç** (sağ tık > Tümünü ayıkla).
2. https://github.com/lumiomaster/lumio-salon adresini aç.
3. **Add file** > **Upload files** de.
4. Açtığın klasörün **içindeki her şeyi** (index.html, manifest.json, sw.js, firestore.rules, **css**, **js**, **icons** klasörleri, KURULUM.md) tarayıcı penceresine **sürükleyip bırak**. (Klasörleri tek tek açma; klasörün kendisini sürükle.)
5. Yüklenme bitince en alttaki yeşil **Commit changes** düğmesine bas.
6. 1–2 dakika bekle, sonra https://lumiomaster.github.io/lumio-salon/ adresini aç. Giriş ekranı görünmeli.

> Not: `.nojekyll` adlı gizli bir dosya da var. Yüklenmezse sorun değil.

## B. Güvenlik kurallarını Firebase'e yapıştır (ÇOK ÖNEMLİ)

1. https://console.firebase.google.com > **lumio-salon** projesi.
2. Sol menü **Build > Firestore Database > Rules** (Kurallar) sekmesi.
3. Kutudaki her şeyi **sil**. `firestore.rules` dosyasını bir yazı programıyla (Not Defteri) aç, **tamamını kopyala**, kutuya **yapıştır**.
4. **Publish** (Yayınla) de. Kırmızı hata çıkarsa ekran görüntüsünü bana gönder.

## C. İki kontrol

- Firebase > **Authentication > Sign-in method**: *E-posta/Şifre* **Etkin** olmalı.
- Firebase > **Authentication > Settings > Authorized domains**: listede `lumiomaster.github.io` olmalı. Yoksa **Add domain** ile ekle.

## D. Test listesi (sırayla yap, sonucu bana yaz)

1. **Salon kur:** Giriş ekranında "Salon kur" sekmesi. Adın, salon adı, telefonun, şifre. Onay kutusunu işaretle. → Ana sayfa açılmalı, "Deneme sürümü, 14 gün kaldı" yazmalı, rozet "Yönetici" olmalı.
2. **Çıkış yap / giriş yap:** Ayarlar > Çıkış yap. Sonra aynı telefon ve şifre ile gir.
3. **Ekip > + Kişi ekle:** Bir **usta**, bir **sekreter**, bir **ortak**, bir **kıdemli yetkili** ekle. Her eklemede çıkan geçici şifreyi not al. Eklerken **senin oturumun açık kalmalı**.
4. **Usta ile giriş:** Başka bir tarayıcıda ya da telefonda (ya da gizli sekmede) ustanın telefonu ve geçici şifresi ile gir. → Altta sadece *Ana sayfa* ve *Ayarlar* olmalı, **Ekip yok**.
5. **Ortak ile giriş:** *Ekip* sekmesini görmeli ama **+ Kişi ekle** ve **Düzenle** düğmeleri olmamalı.
6. **Kıdemli yetkili ile giriş:** Kişi ekleyebilmeli ama listede rol olarak **Kıdemli yetkili** seçeneği çıkmamalı; yöneticinin ve diğer kıdemli yetkilinin **Düzenle** düğmesi olmamalı.
7. **Pasif yap:** Yönetici olarak ustayı **Düzenle > Aktif kutusunu kaldır > Kaydet**. Usta giriş yapmayı denesin → "Hesabınız pasif yapılmış" demeli.
8. **Şifre değiştir:** Ustanın Ayarlar ekranından kendi şifresini değiştirmesi.
9. **Aynı telefon:** Aynı telefon ile ikinci kişi eklemeyi dene → "zaten kayıtlı" demeli.
10. **İnternet kes:** Telefonda uçak modu aç → üstte kırmızı "İnternet yok" şeridi çıkmalı.
11. **Ana ekrana ekle:** Telefonda tarayıcı menüsünden "Ana ekrana ekle". Simge ve ad "LUMIO SALON" olmalı.
12. **Firebase'de bak:** Firestore Database > Data: `salons`, `kullanicilar` koleksiyonları ve salonun içinde `kayitlar` olmalı. Kimlerin ne yaptığı orada kayıtlı.

## E. Bir şey çalışmazsa

- Ekran görüntüsü + ne yaptığını yaz.
- Mümkünse tarayıcıda **F12 > Console** sekmesindeki kırmızı yazıları kopyala.
- Eski sayfa görünüyorsa: sayfayı kapatıp aç ya da Ctrl+Shift+R.

## F. Dürüst notlar

- Güvenlik kurallarını gerçek Firebase'de deneyemiyorum (bu ortamdan Firebase test aracına erişim yok). Arayüz akışlarını sahte bir Firebase ile denedim ve çalışıyor, ama kuralların kendisi senin ilk testinde sınanmış olacak. Küçük bir düzeltme turu normaldir.
- Şifre sıfırlama (unutan kişi için) yok; bu iş sunucu tarafı gerektirdiği için sonraki teslimde Cloudflare ile eklenecek.
- Hukuk metinleri (kullanım koşulları, KVKK) yer tutucu; 8. teslimde eklenecek. Gerçek müşteriyle kullanmadan önce eklenmeli.
- Lisansı uzatmak için Firebase > Firestore > `salons` > salonun belgesi: `durum` alanını `AKTIF` yap ve `bitisMs` adında **number** alan ekle (bitiş zamanı, milisaniye). Bunu sonraki teslimlerde panelden yapılacak hale getiririz.

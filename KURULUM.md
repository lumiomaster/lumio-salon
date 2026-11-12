# Teslim 13 (1.3.0) — kurulum sırası

## Yenilikler
1. **Yasal metinler 5 dilde** (Türkçe, Rusça, Kazakça, Almanca, İngilizce): kullanım şartları, gizlilik ve müşteri aydınlatma şablonu kullanıcının dilinde açılır. Taslak uyarısı kaldırıldı.
2. **Salon sahibi ilk girişte kabul eder:** kendi dilinde şartları okur, kutuyu işaretleyip "Kabul ediyorum ve devam et" der. Kabul; tarih, saat, hesap ve dil ile kayda geçer, sonradan değiştirilemez. Yönetici panelinde her salonda "Kabul etti: tarih" ya da "Kabul bekliyor" görünür; bekleyenlere **"Kabulü hatırlat"** (WhatsApp) düğmesi vardır. Yeni salon formundaki onay kutusu kaldırıldı.
3. **Yeni giriş mesajı:** adres, telefon, geçici şifre, süre, **iPhone ve Android kurulumu**, **bildirimleri açma**, başlangıç ve kabul bilgisi. Mesaj dilini (Türkçe/Rusça/Kazakça/Almanca/İngilizce) pencerede seçersiniz; ülkeye göre varsayılan gelir ve salon başına hatırlanır. Lisans hatırlatma mesajı da aynı şekilde dil seçmeli.
4. **Kurulum sihirbazı:** herkes kendi telefonunda ilk girişte 3 adımlı görsel sihirbazı görür (telefona kurulum, bildirim açma, kılavuz). Sonradan **Ayarlar > Yardım ve kurulum**.
5. **Yardım / kullanım kılavuzu:** uygulama içinde, 5 dilde, role göre (yönetici/sekreter/usta) kısa konular. Her konuda "Neden böyle?" mantık açıklaması vardır.
6. **Usta Danışman uygulama uzmanı oldu:** "nasıl yapılır / neden böyle" sorularında adımları ve mantığını anlatır, rolün görmediği bilgiyi vermez, kullanıcının dilinde cevap verir. Yeni önerilen sorular: "Kazancım nasıl hesaplanıyor?", "Ödemeyi iptal edersem ne olur?".

## Kurulum sırası
A. Zip'i ayıkla > GitHub **Add file > Upload files** > içindekilerin **hepsini** sürükle > **Commit changes** > yeşil tik > **Ctrl+Shift+R** (Ayarlar'da sürüm **1.3.0** yazmalı).
B. Zip yayında olduktan SONRA Firebase > Firestore > **Rules** > `firestore.rules` içeriğinin tamamını yapıştır > **Publish** (yeni: salon sahibinin `kabul` alanı).
C. Cloudflare > lumio-salon-ai > Edit code > `worker.js` içeriğini yapıştır > **Deploy** (Danışman'ın uygulama bilgisi için).

## Mevcut salonlar
Daha önce açılmış salonların sahipleri bir sonraki girişlerinde kabul ekranını bir kez görür. Yönetici panelinde "Kabul bekliyor" yazar.

## Yasal metinlerde dolduracağınız bilgiler (js/config.js > SIRKET)
Metinlerde sağlayıcı adı **LUMIO SALON**, iletişim **WhatsApp +90 535 404 93 92** ve veri saklama süresi **12 ay** olarak yazılıdır. Şirket kurulunca unvanı/adresi, saklama süresini ve iade koşullarını `SIRKET` ayarından güncelleyin.

## Dürüst notlar
- Rusça ve Kazakça metinler (arayüz, yasal metin, kılavuz, mesajlar) yapay zekâ ile hazırlandı; satıştan önce ana dili o olan biriyle okutun.
- Yasal metinler genel bir çerçevedir; Kazakistan/Özbekistan'ın veri yerelleştirme kurallarını avukatınıza danışın.
- iPhone'da bildirim yalnız uygulama ana ekrana eklenip oradan açılınca çalışır; mesaj ve sihirbaz bunu söyler.


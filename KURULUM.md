# Teslim 12 (1.2.0) — Çok dilli uygulama: kurulum sırası

## Yenilikler
1. **5 dil:** Türkçe, Rusça, Kazakça (Kiril), Almanca, İngilizce. Herkes kendi dilini seçer: giriş ekranında ve **Ayarlar > Dil**. Seçim yalnız o telefonu etkiler. Para birimi salon başına tektir (herkes aynı parayı görür).
2. **Mesaj şablonları dili:** **Ayarlar > Mesaj şablonları > Mesaj dili**. Türkçe kullanan yönetici şablonları Rusça/Kazakça yapabilir. Her dil için ayrı özel metin düzenlenir ("Düzenlenen dil").
3. **Müşteri başına dil:** "Göndermeden önce dili seçtir" açılırsa her WhatsApp gönderiminde dil seçilir; son seçim o müşteri için hatırlanır.
4. **Yeni salon formu sadeleşti:** yönetici yalnız ülkeyi (lisans takibi için) seçer; dil ve para birimini salon sahibi ilk girişte kendisi seçer.
5. **Giriş bilgisini gönder** (WhatsApp), lisans hatırlatma mesajı, bitişe 7 gün kala büyük uyarı penceresi ve destek WhatsApp düğmesi.
6. **Usta Danışman** kullanıcının uygulama dilinde cevap verir (Worker güncellemesi gerekir).

## Kurulum sırası
A. Zip'i ayıkla > GitHub **Add file > Upload files** > içindekilerin **hepsini** sürükle > **Commit changes** > yeşil tik > **Ctrl+Shift+R** (Ayarlar'da sürüm **1.2.0** yazmalı).
B. Zip yayında olduktan SONRA Firebase > Firestore > **Rules** > `firestore.rules` içeriğinin tamamını yapıştır > **Publish** (yeni: `ulkeKayit`, `mesajlar_ru/kk/de/en`, `sablonDil`, `dilSor`).
C. Cloudflare > lumio-salon-ai > Edit code > `worker.js` içeriğini yapıştır > **Deploy** (yalnız Danışman'ın dil desteği için; yapmazsa Danışman Türkçe cevap verir).

## Dürüst notlar
- **Rusça ve Kazakça çeviriler makine destekli taslaktır; satıştan önce ana dili o olan biriyle kontrol ettirin.**
- Yasal metinler (kullanım şartları, gizlilik, müşteri aydınlatma) hâlâ yalnız Türkçedir; ülke bazlı sürümler avukat onayından sonra eklenecek.


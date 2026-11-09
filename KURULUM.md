# LUMIO SALON – 4. Teslim (Ödeme ve kasa)

Yeni: alttaki menüde **Kasa**.

**Yönetici, kıdemli, sekreter, ortak** için iki bölüm:
- **Günlük kasa:** tarih seç, o günün nakit / kart / kart komisyonu / net toplamı ve ödeme listesi. **Ödemesi alınmamış randevular** burada uyarı olarak çıkar (son 14 gün): **Öde** ya da **İptal**. **+ Ürün satışı** ile randevusuz satış girilir.
- **Usta hesapları** (yönetici, kıdemli, ortak görür): usta usta hizmet cirosu, ürün satışı, hakediş (komisyon düşülmüş), avans, önceki dönemden borç ve **ödenecek**; salon toplamı; ustanın akşam **mutabakat** durumu (Onayladı / İtiraz var + notu); **Avans ver**; **Hesabı kapat**; kapanmış dönemler.

**Usta** için **Kazancım:** günün satırları ve payı, **Onaylıyorum / İtirazım var (not)**, dönem özeti, avanslar.

Ödeme alabilenler: yönetici, kıdemli, sekreter. Ödemeyi **yönetici/kıdemli iptal** edebilir (yalnız içinde bulunulan dönemde; randevu "ödeme bekliyor"a döner). Kapanmış dönemdeki ödeme değiştirilemez.

Hesap kuralı (LUMIO'daki gibi): kartla alınan ödemede komisyon **önce** düşülür, kalan tutar ustanın yüzdesine göre bölünür; usta ve salon komisyonu birlikte taşır. Ürün satışında usta, kendi **ürün primi** kadar alır. Hakedişten fazla avans alan ustanın farkı **borç** olarak sonraki döneme devreder.

## A. GitHub'a yükle
Zip'i **ayıkla** > GitHub **Add file > Upload files** > ayıkladığın klasörün içindeki **her şeyi** sürükle > **Commit changes** > 1–2 dk bekle > **Ctrl+Shift+R**. (Yeni dosyalar: `ekranlar/kasa.js, hesap.js, kazancim.js, odeme-formu.js`, `kasa-mantik.js`.)

## B. Kuralları yenile (YENİ KURALLAR VAR, mutlaka yap)
Firebase > Firestore Database > **Rules** > her şeyi sil, yeni `firestore.rules`ın tamamını yapıştır > **Publish**. Hata verirse ekran görüntüsünü gönder.

## C. Test listesi
Hazırlık: Salon > Genel'de **kart komisyonu** (örn. 2) kayıtlı olsun; ustalarda **yüzde** girili olsun (örn. 40).

1. Bir randevu al, **geçmiş bir güne** (örn. dün). **Kasa**'da sarı "Ödemesi alınmamış 1 randevu" uyarısı çıkmalı.
2. **Öde:** tutarı yaz (1000), **Kart** seç. Komisyon önizlemesi (2% = 20) görünmeli. **Ödemeyi kaydet.** Uyarı kaybolmalı; Takvim'de randevuda "Ödendi" yazmalı.
3. **Günlük kasa:** kart 1.000, komisyon 20, net 980. **+ Ürün satışı:** "Şampuan" 200 TL nakit, satan usta seç.
4. **Usta hesapları:** ustanın hakedişi 980 × %40 = **392** olmalı (ürün primi 0 ise ürün 0). Salon toplamında ciro 1.200 görünmeli.
5. **Avans ver:** 100 TL. Ödenecek 292 olmalı.
6. **Usta olarak giriş:** Kasa > **Kazancım**'da 392 görünmeli. **Onaylıyorum**'a bas. Sonra "İtirazım var" için not yazıp bas.
7. **Yönetici:** Usta hesapları'nda ustanın "İtiraz var" ve notunu görmeli.
8. **Sekreter olarak giriş:** Kasa'da günlük kasayı görür, ödeme alır; **Usta hesapları yok**, yüzdeleri görmez.
9. **Yönetici: ödemeyi iptal et** (Günlük kasa > ödemeye dokun > İptal). Randevu yeniden "ödeme bekliyor" olmalı, hesap düşmeli.
10. **Hesabı kapat:** bir ustaya hakedişinden çok avans ver (eksi bakiye), **Hesabı kapat**. Yeni dönemde o usta "Önceki dönemden borç" göstermeli, sayaçlar sıfırlanmalı, "Kapanmış dönemler"de dönem görünmeli.

## D. Dürüst notlar
- Kuralları gerçek Firebase'de deneyemiyorum; ekran akışını sahte Firebase ile denedim (hepsi geçti). Kırmızı **"yetkiniz yok"** çıkarsa ekran görüntüsünü gönder.
- Usta, aynı ödemede adı geçen diğer ustaların satırlarını da görebilir (aynı müşterinin ortak ödemesi). Usta yüzdelerini görmez.
- Sekreter yüzdeleri göremediği için hakediş hesabı sekreter ekranında yoktur; hesap, yüzdeleri görebilenlerde (yönetici, kıdemli, ortak) ve ustanın kendisinde yapılır. Yüzdeyi **sonradan değiştirirsen**, açık dönemin tamamı yeni yüzdeyle hesaplanır; dönemi kapattığında rakamlar sabitlenir.
- Ürün satışı şimdilik stoktan düşmez; stok 6. teslimde bağlanır.
- Müşteri defteri, borç/veresiye ve mutabakat için bildirim sonraki teslimlerde.

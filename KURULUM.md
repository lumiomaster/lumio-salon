# Teslim 17 (1.7.0)

## Yenilikler
Hesap kapatma onaysız ustayla yapılamaz. Randevu formu: stoktan akıllı ürün arama (formül otomatik), "Not ekle", müşteri akıllı arama, sonraki ziyaret planı. Ekip: telefon düzenleme, eski çalışanı kalıcı silme. Aydınlık/karanlık tema ve yazı boyutu, muhasebe CSV dışa aktarma, kâr grafikleri, internet kesilince uyarı, destek modu (salonun izniyle, süreli, salt okunur), yönetici ek doğrulama (2 adım) ve vekil.

## Kurulum sırası
1. Zip'in içindekileri GitHub'a yükleyin (`.nojekyll` dahil).
2. Site yayına girince Firebase > Firestore > Kurallar: `firestore.rules` içeriğini yapıştırıp **Yayınla**.
3. Cloudflare > lumio-salon-ai > Edit code: `worker.js` yapıştırıp **Deploy** (yeni yollar: /telefon-degistir, /mfa-hazirla, kalıcı /hesap-sil). Yeni secret yok.
4. Yeni salonlar yasal metnin v6 sürümünü kabul eder; mevcut salonlar yeniden onaylamaz (kabul bir kez yazılır).
5. Danışmana fotoğraf eklenebilir (worker.js bunun için güncellendi; Deploy şart). Hizmetler Bölüm'e göre gruplanır: Firestore kuralı şart, mevcut hizmetleri Düzenle'den bölüme atayın.

## Veri yedeği (Blaze gerekir)
Firebase > Firestore > Disaster recovery > Scheduled backups: günlük yedek, saklama 7+ gün. Geri alma: aynı sayfada yedeğin yanındaki Restore ile yeni bir veritabanına; kontrol edip geçiş yapın. Ayrıca Point-in-time recovery açılabilir. Bütçe uyarısı için Billing > Budgets'ta bir limit koyun.

## Ek doğrulama (2 adım)
Firebase > Authentication > Settings > "Upgrade to Identity Platform" ; sonra Sign-in method > Multi-factor authentication > TOTP etkinleştir. Ardından yönetici panelinde Hesabım > "Ek doğrulamayı aç". Etkinleştirilmezse kart açıklayıcı hata verir; uygulamanın geri kalanı etkilenmez. Önce vekil hesabı ekleyin.

## Dürüst notlar
Ek doğrulama canlı olarak burada denenemedi; ilk yönetici hesabında deneyin. Destek modu yalnızca salon sahibi açınca çalışır, gizli erişim yoktur.

# Teslim 16 (1.6.0) — kurulum sırası
Bu zip, 14. ve 15. teslimlerin TÜMÜNÜ de içerir (ayrıca yüklemenize gerek yok).

## Yenilikler: Satış ve analiz paketi (ek ücretli)
1. **Paket salon başına açılır:** Yönetici paneli > salon kartı > **Düzenle** > "Satış ve analiz paketi (ek ücretli)" kutusu. Yalnız platform yöneticisi açıp kapatır (Firebase kuralları salonun kendi kendine açmasını engeller). Açık salonda kartta "Satış paketi açık" rozeti görünür. Kapalıyken ilgili kartlar ve düğmeler hiç görünmez.
2. **Salonun kendi ürün listesi:** Salon > Genel > **Satış ürünleri**. Her ürün: ad, hangi analizde (saç / tırnak / kaş / cilt) ve hangi konuda yardımcı olduğu, kullanım talimatı, **serbest satın alma bağlantısı** (kendi mağazası, pazaryeri ya da toptancısı; yalnız https). Katalog ya da toptancı sizde değil, salonun kendisinde.
3. **Fotoğraf analizi:** Müşteri kartı > **Fotoğraf analizi**. Tür seç, 1-2 fotoğraf çek (telefonda küçültülür), müşteri **onay kutusu** işaretlenmeden "Analiz et" açılmaz. Yapay zekâ kozmetik gözlem yapar ve **yalnız salonun listesinden** ürün seçer.
4. **WhatsApp:** "WhatsApp ile müşteriye gönder" gözlemi, ürün gerekçesini, kullanım talimatını ve satın alma bağlantısını müşterinin seçilen dilinde (TR/RU/KK/DE/EN) yollar. Mesajın sonunda "tıbbi değerlendirme değildir" cümlesi vardır.
5. **Fotoğraf saklanmaz:** ne uygulamada ne sunucuda. Yalnız analiz kaydı tutulur (kim, hangi müşteri, ne zaman, tür, önerilen ürünler, müşterinin onay verdiği). Testte veritabanında fotoğraf verisi bulunmadığı denetlendi.
6. **Güvenlik/limit:** Worker, salonun paketi açık olup olmadığını kendisi doğrular (istemci sahte bayrak gönderse reddeder); müşteri onayı olmayan istek reddedilir; kişi başı günde 40, salon başı günde 200 fotoğraf analizi (Cloudflare değişkenleri `FOTO_KISI_GUNLUK`, `FOTO_SALON_GUNLUK` ile değişir).
7. **Gizlilik metnine** 5 dilde "Fotoğraf analizi" maddesi eklendi (yasal sürüm **v5**): bütün salon sahipleri bir sonraki girişte metni yeniden kabul eder.
8. **SSS:** 3 yeni madde (toplam 66, 5 dilde).

## Kurulum sırası
A. Zip'i ayıkla > GitHub **Add file > Upload files** > içindekilerin **hepsini** sürükle > **Commit changes** > yeşil tik > **Ctrl+Shift+R** (Ayarlar'da sürüm **1.6.0** yazmalı).
B. Zip yayında olduktan SONRA Firebase > Firestore > **Rules** > `firestore.rules` içeriğinin tamamını yapıştır > **Publish**. **ZORUNLUDUR** (yeni: `satisUrunler`, `analizler`, salonda `satis` bayrağı, mesaj türü `analiz`).
C. Cloudflare > lumio-salon-ai > Edit code > `worker.js` içeriğini yapıştır > **Deploy** (yeni uç nokta `/foto-analiz`). Fotoğraf için **GEMINI_API_KEY** (mevcut) yeterlidir; `ANTHROPIC_API_KEY` eklenirse Claude önce kullanılır. Fotoğraf analizi ücretli API kullanır: Google tarafında faturalandırma açık olmalı.
D. Bir salonda denemek için: Yönetici paneli > o salon > Düzenle > paketi aç > salon sahibi çıkış-giriş yapsın.

## Dürüst notlar
- Fotoğraf yurt dışındaki yapay zekâ servisine (Google/Anthropic) gider. Kazakistan/Özbekistan veri yerelleştirme ve müşteri onayı sorumluluğu avukata danışılacak konular listesinde (satıştan önce).
- Öneriler kozmetik gözlemdir; yapay zekâ tıbbi teşhis koymayacak şekilde yönlendirilir, şüpheli görünümde doktora yönlendirme uyarısı ekler. Yine de kesin sonuç gibi sunulmamalı.
- Satın alma bağlantısındaki ürün ve satıcıdan salon sorumludur (gizlilik metninde yazılı).
- Fiyatlandırma henüz belirlenmedi; paket sadece açıp kapatma bayrağıdır, otomatik ücret tahsil etmez.
- Yeni metinler (RU/KK/DE/EN) yapay zekâ çevirisidir; ana dili konuşan biri okumalı.

---

# Teslim 15 (1.5.0) — kurulum sırası
Bu zip, 14. teslimin TÜMÜNÜ de içerir (14'ü ayrıca yüklemenize gerek yok).

## Yenilikler
1. **Müşteri sadakat ödülü:** Salon > Genel > **Sadakat ödülü > Ayarla**. Ölçü seçilir: ziyaret sayısı, toplam harcama ya da ikisi (hangisi önce dolarsa). Ödül: yüzde ya da sabit tutar indirim. **İndirimi kim karşılar?** → "Salon ve usta birlikte" (usta yüzdesi indirimli tutar üzerinden) ya da "Yalnız salon" (ustanın payı değişmez).
2. **Ödeme ekranında "Sadakat ödülünü uygula"** kutusu, müşterinin hakkı dolunca çıkar (yalnız ofis rolleri uygular). İndirim yalnız hizmetlerden düşer, ürün satışına uygulanmaz. Ödeme kaydedilince sayaç yeniden başlar; ödeme iptal edilirse hak geri gelir.
3. **Müşteri kartında** ilerleme çubuğu, "Ödül hazır" bilgisi ve **Ödül mesajı gönder** (WhatsApp, 5 dilde şablon; Şablonlar'dan düzenlenir).
4. **SSS:** 2 yeni madde (sadakat kurulumu, ödülü uygulama) — toplam 63, 5 dilde.
5. **Otomatik kural denetimi (test):** uygulamanın yazdığı her alan, Firebase kurallarındaki izinli alan listesiyle otomatik karşılaştırılır (28 koleksiyon, uyumsuz 0). Usta "yetkiniz yok" hatası gibi alan adı uyuşmazlıkları artık testte yakalanır.
6. **Hata düzeltmesi (14a'dan):** ustanın "Onaylıyorum", avans, işlem notu, stok hareketi, müşteri, gider ve mal kabul işlemlerinde çıkan "Bu işlem için yetkiniz yok…" uyarısı (kurallarda `notlar`/`not` uyuşmazlığı) giderildi.

## Kurulum sırası
A. Zip'i ayıkla > GitHub **Add file > Upload files** > içindekilerin **hepsini** sürükle > **Commit changes** > yeşil tik > **Ctrl+Shift+R** (Ayarlar'da sürüm **1.5.0** yazmalı).
B. Zip yayında olduktan SONRA Firebase > Firestore > **Rules** > `firestore.rules` içeriğinin tamamını yapıştır > **Publish**. **ZORUNLUDUR:** usta hata düzeltmesi, sadakat ayarı, ödül mesajı, `sssEksik` ve yönetici okuması bu kurallara bağlıdır.
C. Cloudflare > lumio-salon-ai > Edit code > `worker.js` (14. teslimle aynı) yapıştır > **Deploy**. `ANTHROPIC_API_KEY` isteğe bağlıdır, şimdilik beklemede.

## Dürüst notlar
- Sadakat sayacı müşterinin ödemelerinden hesaplanır (sayaç alanı yok); bu yüzden iptal/düzeltme otomatik doğru çalışır. Telefonsuz/eşleşmeyen müşteride (randevuya bağlı değilse) ödül uygulanmaz.
- Rusça/Kazakça/Almanca/İngilizce yeni metinler yapay zekâ çevirisidir; satıştan önce ana dili o olan biri okumalıdır.

---

# Teslim 14 (1.4.0) — kurulum sırası

## Yenilikler
1. **SSS (Sık sorulan sorular):** 61 madde, 5 dilde; uygulamanın her ekranını ve düğmesini "ne işe yarar / ne zaman / basınca ne olur / dikkat" şeklinde anlatır. Arama kutusu, kategori çipleri, role göre süzme (usta kâr ekranını, sekreter ciroyu görmez). **Ana sayfa** ve **Ayarlar > Yardım ve kurulum** kartlarından açılır.
2. **Danışman önce SSS'ye bakar:** "ödemeyi nasıl iptal ederim" gibi uygulama soruları yapay zekâya gitmeden SSS cevabıyla verilir ("SSS'de aç" bağlantısıyla). İş tavsiyesi soruları ("fiyat artışını nasıl söylerim") Danışman'a gider. Bu, yapay zekâ maliyetini ciddi azaltır.
3. **Cevapsız sorular listesi:** SSS'de karşılığı olmayan Danışman soruları **kimliksiz** (yalnız soru metni ve dil) saklanır. Yönetici paneli > **Sorular** sekmesinde en çok sorulandan başlayarak görürsünüz; buna göre yeni SSS maddesi yazın. Gizlilik metnine 5 dilde bilgi cümlesi eklendi (yasal sürüm v4).
4. **Claude API desteği (worker):** `ANTHROPIC_API_KEY` tanımlarsanız Danışman önce Claude'u (varsayılan `claude-haiku-5-5`, `CLAUDE_MODEL` ile değişir) kullanır; değişmeyen kısım önbelleğe alınır; Claude hata verirse Gemini yedek olur. Anahtar yoksa eskisi gibi Gemini çalışır.
5. **Görünmez kötüye kullanım tavanı:** kişi başı günlük 100, salon başı 500 soru (Cloudflare değişkenleri `AI_KISI_GUNLUK`, `AI_SALON_GUNLUK` ile değişir). Aşılırsa "çok fazla soru soruldu, yarın tekrar deneyin" der; "hakkın doldu" yazısı yok.
6. **Salon kartında personel sayısı:** yönetici panelinde her salonda "👥 N personel" + yönetici/ortak, sekreter, usta ve eski çalışan dağılımı; "En çok personel önce" sıralaması.
7. **Salon kartı düğmeleri tek satır:** Süre ekle · Pasif/Aktif yap · **Mesaj gönder** · Düzenle. "Mesaj gönder" pencerede giriş bilgisi, lisans hatırlat ve kabulü hatırlat seçeneklerini açar.

## Kurulum sırası
A. Zip'i ayıkla > GitHub **Add file > Upload files** > içindekilerin **hepsini** sürükle > **Commit changes** > yeşil tik > **Ctrl+Shift+R** (Ayarlar'da sürüm **1.4.0** yazmalı).
B. Zip yayında olduktan SONRA Firebase > Firestore > **Rules** > `firestore.rules` içeriğinin tamamını yapıştır > **Publish** (yeni: `sssEksik` koleksiyonu ve yönetici için `kullanicilar` okuma). Yayınlanana kadar personel sayısı "0" ve Sorular boş görünür; uygulama bozulmaz.
C. Cloudflare > lumio-salon-ai > Edit code > `worker.js` içeriğini yapıştır > **Deploy**. İsteğe bağlı: Settings > Variables and Secrets > `ANTHROPIC_API_KEY` (Secret) ekleyin.

## Düzeltme a
Firebase kurallarında bazı koleksiyonlarda alan adı uyuşmazlığı vardı (kurallar `notlar`, uygulama `not` yazıyordu): ustanın hesap onayı/itirazı, avans, işlem notu, stok hareketi, müşteri, gider ve mal kabul kayıtları "yetkiniz yok" hatası verebilirdi. Kurallar uygulamayla eşitlendi. **Firestore Rules'u mutlaka yeniden Publish edin.**

## Dürüst notlar
- SSS Rusça/Kazakça/Almanca/İngilizce metinleri yapay zekâ ile hazırlandı; satıştan önce ana dili o olan biriyle okutun.
- SSS cevaplarındaki düğme adları sözlükteki çevirilerle birebir aynı olmayabilir; ana dili konuşan kişi düzeltebilir.
- Eşleştirme anahtar kelimeyle çalışır; Sorular sekmesindeki kayıtlar, hangi maddelere anahtar kelime/madde ekleneceğini gösterir.

---
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


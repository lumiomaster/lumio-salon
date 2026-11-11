// Hukuk metinleri — TASLAKTIR. Yayına çıkmadan önce bir avukat tarafından incelenip düzeltilmelidir.
// Metinlerde [KÖŞELİ PARANTEZ] içindekiler şirket bilgileriyle doldurulacak alanlardır.
import { t } from './i18n.js';
import { h } from './util.js';
import { S } from './durum.js';
import { pencereAc } from './util.js';

const UYARI = 'TASLAK — Bu metin hukuki danışmanlık değildir. Yayına çıkmadan önce avukat onayı gerekir.';

export const HUKUK = {
  sartlar: {
    ad: 'Kullanım şartları',
    metin: [
      ['1. Taraflar ve konu', 'Bu şartlar, [ŞİRKET ÜNVANI] ("Sağlayıcı") ile LUMIO SALON uygulamasını kullanan salon ("Salon") arasındaki kullanım koşullarını düzenler. LUMIO SALON; randevu, kasa, stok, müşteri kaydı ve ekip yönetimi için sunulan bulut tabanlı bir yazılım hizmetidir.'],
      ['2. Hesap ve yetkiler', 'Salon, hesabı oluşturan kişinin salon adına işlem yapma yetkisi olduğunu kabul eder. Kullanıcıların rolleri (yönetici, kıdemli, ortak, sekreter, usta) Salon tarafından belirlenir. Şifrenin gizliliğinden kullanıcı sorumludur.'],
      ['3. Lisans ve ücret', 'Hizmet deneme süresi ve ardından lisans süresi ile sunulur. Lisans süresi bittiğinde yeni kayıt yapılamaz; mevcut veriler [SAKLAMA SÜRESİ] boyunca saklanır. Ücret, süre ve iade koşulları [FİYAT/İADE POLİTİKASI] bölümünde belirtilir.'],
      ['4. Salonun yükümlülükleri', 'Salon; müşterilerinin kişisel verilerini mevzuata uygun işlemekten, gerekli aydınlatmayı yapmaktan ve gerektiğinde müşterilerinden izin almaktan sorumludur. Uygulama üzerinden gönderilen WhatsApp mesajlarının içeriği ve alıcıların uygunluğu Salon\'un sorumluluğundadır.'],
      ['5. Hizmetin niteliği', 'Uygulamadaki hesaplamalar (kazanç, komisyon, kâr, stok) Salon\'un girdiği verilere dayanır ve bilgilendirme amaçlıdır; muhasebe, vergi veya yasal belge yerine geçmez. Yapay zekâ danışman genel bilgi ve fikir verir; tıbbi, hukuki veya mali kesin tavsiye değildir.'],
      ['6. Kesintiler ve sorumluluk', 'Hizmet "olduğu gibi" sunulur. Bakım, internet veya üçüncü taraf (Google/Firebase, Cloudflare vb.) kesintilerinden doğan zararlardan Sağlayıcı\'nın sorumluluğu, mevzuatın izin verdiği ölçüde, Salon\'un son 12 ayda ödediği lisans bedeliyle sınırlıdır.'],
      ['7. Fesih', 'Taraflar bildirimle sözleşmeyi sona erdirebilir. Fesihte Salon verilerinin dışa aktarılması talep edilebilir; veriler [SAKLAMA SÜRESİ] sonunda silinir veya anonim hale getirilir.'],
      ['8. Uygulanacak hukuk', 'Türk hukuku uygulanır; uyuşmazlıklarda [YETKİLİ MAHKEME] yetkilidir.'],
      ['9. İletişim', '[ŞİRKET ÜNVANI] · [ADRES] · [E-POSTA] · [TELEFON]']
    ]
  },
  gizlilik: {
    ad: 'Gizlilik ve KVKK aydınlatma metni (kullanıcılar için)',
    metin: [
      ['1. Veri sorumlusu', '6698 sayılı Kişisel Verilerin Korunması Kanunu ("KVKK") kapsamında veri sorumlusu [ŞİRKET ÜNVANI], adres: [ADRES], e-posta: [E-POSTA]. Müşterilere ait veriler bakımından veri sorumlusu ilgili salondur; Sağlayıcı bu verilerde veri işleyen konumundadır.'],
      ['2. İşlenen veriler', 'Kullanıcı: ad-soyad, telefon numarası, rol, şifre (şifrelenmiş), işlem kayıtları. Salon: salon adı, hizmet/ürün/stok/kasa kayıtları. Salon müşterileri (salon girer): ad-soyad, telefon, doğum tarihi, randevu ve işlem geçmişi, formül/not bilgileri.'],
      ['3. Amaç ve hukuki sebep', 'Hizmetin sunulması, hesap güvenliği, lisans yönetimi, destek, yasal yükümlülüklerin yerine getirilmesi. Hukuki sebepler: sözleşmenin ifası (KVKK m.5/2-c), hukuki yükümlülük (m.5/2-ç), meşru menfaat (m.5/2-f).'],
      ['4. Aktarım', 'Veriler bulut altyapı sağlayıcılarına (Google Firebase, Cloudflare) hizmetin sunulması amacıyla aktarılır; bu sağlayıcıların sunucuları yurt dışında olabilir. Yurt dışına aktarım KVKK m.9 şartlarına uygun yapılır: [AÇIK RIZA / TAAHHÜT / STANDART SÖZLEŞME].'],
      ['5. Saklama', 'Veriler hizmet süresince ve yasal saklama süreleri boyunca tutulur; süre sonunda silinir, yok edilir veya anonim hale getirilir.'],
      ['6. Haklarınız', 'KVKK m.11 uyarınca verilerinizin işlenip işlenmediğini öğrenme, bilgi talep etme, düzeltme, silme, itiraz etme ve zararın giderilmesini isteme haklarına sahipsiniz. Başvuru: [E-POSTA].'],
      ['7. Güvenlik', 'Veriler şifreli bağlantı (HTTPS) üzerinden iletilir; erişim rol bazlı yetkilendirme ile sınırlandırılır.']
    ]
  }
};

// Salonun kendi müşterilerine göstereceği aydınlatma metni şablonu (salon adı otomatik yazılır)
export function musteriAydinlatma() {
  const salon = (S.salon && S.salon.ad) || '[SALON ADI]';
  return {
    ad: 'Müşteri aydınlatma metni (salonunuz için şablon)',
    metin: [
      ['Veri sorumlusu', salon + ' (adres: [SALON ADRESİ], telefon: [SALON TELEFONU]).'],
      ['İşlenen veriler', 'Ad-soyad, telefon numarası, doğum tarihi (verirseniz), randevu ve işlem geçmişi, uygulanan işlemlere ilişkin notlar/formül bilgileri.'],
      ['Amaç', 'Randevunuzun oluşturulması ve hatırlatılması, hizmetin sunulması, ödeme ve kayıt işlemlerinin yürütülmesi, size daha uygun hizmet verilebilmesi.'],
      ['Hukuki sebep', 'Hizmetin ifası için gerekli olması ve yasal yükümlülükler (KVKK m.5/2-c, ç). Kampanya/doğum günü gibi ticari mesajlar için ayrıca onayınız alınır.'],
      ['Aktarım', 'Verileriniz salonumuzun kullandığı yazılım hizmet sağlayıcılarına (bulut altyapısı) hizmet amacıyla aktarılabilir; yasal talepler dışında üçüncü kişilerle paylaşılmaz.'],
      ['Haklarınız', 'KVKK m.11 kapsamındaki haklarınızı (bilgi alma, düzeltme, silme, itiraz) salonumuza başvurarak kullanabilirsiniz.'],
      ['Ticari mesaj izni', 'Randevu hatırlatma dışındaki kampanya, doğum günü ve tanıtım mesajları için müşteriden ayrıca izin alınması (6563 sayılı Kanun / İYS) gerekebilir. Bunu avukatınıza danışın.']
    ]
  };
}

export function hukukGoster(anahtar) {
  const m = anahtar === 'musteri' ? musteriAydinlatma() : HUKUK[anahtar];
  const govde = h('div', { class: 'hukuk' },
    h('p', { class: 'hata' }, UYARI),
    m.metin.map(([b, y]) => h('div', null, h('strong', null, b), h('p', null, y))));
  const kopya = anahtar === 'musteri' ? h('button', { class: 'dugme ikincil', type: 'button', onclick: async () => {
    const tam = m.ad + '\n\n' + m.metin.map(([b, y]) => b + '\n' + y).join('\n\n');
    try { await navigator.clipboard.writeText(tam); } catch (e) { /* kopyalanamadı */ }
  } }, t('Metni kopyala')) : null;
  pencereAc(t(m.ad), h('div', { class: 'form' }, govde, kopya));
}

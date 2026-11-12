// Müşteri mesajları (WhatsApp tek tık). LUMIO'daki şablonların Pro uyarlaması.
// Hazır metinler LUMIO'dakiyle aynı; salon Ayarlar > Mesaj şablonları'ndan değiştirebilir (ayarlar/mesajlar).
import { S } from './durum.js';
import { db, doc, getDoc } from './fb.js';
import { SABLON_DIL, USTA_SATIR_ON } from './sablon-metinler.js';

// "AYŞE yılmaz" -> "Ayşe YILMAZ"
export function hitap(isim) {
  const k = String(isim || '').trim().replace(/\s+/g, ' ').split(' ').filter(Boolean);
  if (!k.length) return '';
  const bas = (x) => x.charAt(0).toLocaleUpperCase('tr-TR') + x.slice(1).toLocaleLowerCase('tr-TR');
  if (k.length === 1) return bas(k[0]);
  const soyad = k.pop().toLocaleUpperCase('tr-TR');
  return k.map(bas).join(' ') + ' ' + soyad;
}

// Metinler ve emojiler LUMIO (bireysel) uygulamasındaki şablonlarla aynıdır.
// {USTA_SATIR}: usta biliniyorsa "💇 Uzmanımız: Ad" satırı, bilinmiyorsa hiç yazılmaz. {IMZA}: salon adı.
const SABLON = {
  takip: '📅 Merhaba Sayın {MUSTERI_ADI},\n\nSon işlemimizin üzerinden geçen süreye istinaden, randevu zamanınızı planlamak adına sizi rahatsız ediyoruz 🌸\n\n⏰ Planlanan Tarih: {TARIH}\n{USTA_SATIR}\n📞 Randevunuzu netleştirmek için bu mesaja yanıt vermeniz yeterlidir.\n\nKeyifli günler dileriz! ✨\n{IMZA}',
  dogum: 'Mutlu Yıllar Sayın {MUSTERI_ADI}! 🎂🎉\n\n{SALON_ADI} olarak yeni yaşınızın sağlık, huzur ve bolca ışıltı getirmesini dileriz. 🌸\n\n🎁 Doğum gününüze özel sürpriz bakım hediyeniz salonumuzda sizi bekliyor! Randevunuzu almayı unutmayın.\n\nSevgilerle,\n{IMZA}',
  davet: 'Merhaba Sayın {MUSTERI_ADI}, ☕🌸\n\n{SALON_ADI} olarak bir süredir yokluğunuzu hissediyor, sizi çok özlüyoruz!\n\nHem kendinize hak ettiğiniz ışıltıyı yeniden kazandırmak hem de sıcak bir kahvemiz eşliğinde keyifli bir mola vermek için sizi salonumuza bekliyoruz. ✨\n\nSize en uygun gün ve saati birlikte planlamak için bu mesaja yanıt vermeniz yeterli.\n\nSevgiyle ve güzellikle kalın,\n{IMZA}',
  onay: 'Merhaba Sayın {MUSTERI_ADI}, ✨\n\n🗓️ Tarih: {TARIH}\n⏰ Saat: {SAAT}\n💇 İşlem: {HIZMET}\n\nRandevunuz başarıyla oluşturulmuştur. Planlarınızda bir değişiklik olursa önceden haber vermenizi rica ederiz. 🙏\n\nSizi ağırlamak için sabırsızlanıyoruz!\n{IMZA}',
  hatirlatma: 'Merhaba Sayın {MUSTERI_ADI}, ⏰\n\nYarın için randevunuzu hatırlatmak isteriz:\n\n🗓️ Tarih: {TARIH}\n⏰ Saat: {SAAT}\n💇 İşlem: {HIZMET}\n{USTA_SATIR}\nGelemeyecekseniz lütfen önceden haber veriniz 🙏\n\nGörüşmek üzere!\n{IMZA}',
  puan: 'Merhaba Sayın {MUSTERI_ADI}, 💛\n\nSalonumuzu tercih ettiğiniz için çok teşekkür ederiz. Umarım yeni görünümünüzden keyif almışsınızdır!\n\n⭐ Sadece 30 saniyenizi ayırarak aşağıdaki bağlantıdan Google\'da bizi puanlayıp değerli yorumunuzu paylaşırsanız çok mutlu oluruz:\n{GOOGLE_LINK}\n\n{IMZA}',
  memnuniyet: 'Merhaba Sayın {MUSTERI_ADI}, ✨\n\nSon işlemimizden memnun kaldığınızı umuyoruz. Herhangi bir sorunuz ya da bir isteğiniz olursa bu mesaja yazabilirsiniz; görüşleriniz bizim için çok değerli.\n\n📸 Instagram sayfamızı takip etmeyi unutmayın:\n{INSTAGRAM_LINK}\n\n{IMZA}',
  instagram: 'Merhaba Sayın {MUSTERI_ADI}, ✨\n\n🎁 Salonumuzun yeni trendlerinden haberdar olmak, sürpriz çekilişlerimize ve hediyelerimize hak kazanmak için Instagram sayfamızdaki paylaşımlarımızı beğenmeyi, yorum yapmayı ve takip etmeyi unutmayın!\n\n📸 Instagram Profilimiz:\n{INSTAGRAM_LINK}\n\n{IMZA}',
  iban: 'Merhaba Sayın {MUSTERI_ADI}, 🌸\n\nÖdemenizi aşağıdaki banka / transfer hesabımıza güvenle gerçekleştirebilirsiniz:\n\n🏦 Banka: {BANKA_ADI}\n👤 Hesap Sahibi: {HESAP_SAHIBI}\n💳 IBAN / Hesap / Kart No: {IBAN_NO}\n\nÖdeme sonrası bilgi vermenizi rica eder, güzel günler dileriz! ✨\n{IMZA}',
  odul: 'Merhaba Sayın {MUSTERI_ADI}, 🎁\n\n{SALON_ADI} olarak bizi tercih ettiğiniz için teşekkür ederiz! Sadakatinizin karşılığında bir sonraki ziyaretinizde {ODUL} indirim hakkı kazandınız.\n\nRandevunuzu almak için bu mesaja yazabilirsiniz. Sizi tekrar ağırlamak için sabırsızlanıyoruz 🌸\n\n{IMZA}',
  mutabakatUst: 'Merhaba {USTA_ADI} 👋\n\n📅 {TARIH} günü hesabınız:',
  tesvik: 'Bugün ürün satışınız yok. Her müşteriye bakım sonrası evde kullanacağı bir ürün önermeyi deneyin; küçük bir öneri bile hem müşterinin saçına/cildine hem sizin kazancınıza katkı sağlar 💪',
  tebrik: '🎉 Tebrikler, bugün ürün sattınız!',
  mutabakatAlt: '✅ Doğruysa uygulamada Ana sayfadaki "Onaylıyorum" düğmesine basın; yanlışlık varsa "İtirazım var" deyin.\n\n{IMZA}',
  siparis: 'Merhaba, {SALON_ADI} için sipariş vermek istiyoruz:\n\n{LISTE}\n\nTeşekkürler.'
};

// Şablon ekranı bilgisi: ad, açıklama, kullanılabilir değişkenler
export const SABLON_BILGI = [
  { tur: 'dogum', ad: 'Doğum günü', ack: 'Doğum günü olan müşteriye gider.', degisken: ['MUSTERI_ADI', 'SALON_ADI', 'IMZA'] },
  { tur: 'takip', ad: 'Sonraki ziyaret hatırlatma', ack: 'Önerilen ziyaret tarihi yaklaşan müşteriye gider.', degisken: ['MUSTERI_ADI', 'TARIH', 'USTA_SATIR', 'IMZA'] },
  { tur: 'davet', ad: 'Uzun süredir gelmeyen müşteri', ack: 'Bir süredir gelmeyen müşteriyi geri çağırır.', degisken: ['MUSTERI_ADI', 'SALON_ADI', 'IMZA'] },
  { tur: 'onay', ad: 'Randevu onayı', ack: 'Randevu alınınca müşteriye gider.', degisken: ['MUSTERI_ADI', 'TARIH', 'SAAT', 'HIZMET', 'USTA_SATIR', 'IMZA'] },
  { tur: 'hatirlatma', ad: 'Yarınki randevu hatırlatma', ack: 'Ertesi gün randevusu olan müşteriye gider.', degisken: ['MUSTERI_ADI', 'TARIH', 'SAAT', 'HIZMET', 'USTA_SATIR', 'IMZA'] },
  { tur: 'puan', ad: 'Google puanlama isteği', ack: 'Müşteriden Google\'da 5 yıldızla puanlamasını ister (müşteri kartından).', degisken: ['MUSTERI_ADI', 'GOOGLE_LINK', 'IMZA'] },
  { tur: 'memnuniyet', ad: 'Memnuniyet mesajı', ack: 'İşlemden sonra memnuniyet sorar, Instagram\'a davet eder.', degisken: ['MUSTERI_ADI', 'INSTAGRAM_LINK', 'IMZA'] },
  { tur: 'instagram', ad: 'Instagram daveti', ack: 'Takip, beğeni ve yorum için Instagram\'a davet eder.', degisken: ['MUSTERI_ADI', 'INSTAGRAM_LINK', 'IMZA'] },
  { tur: 'iban', ad: 'IBAN / transfer bilgisi', ack: 'Ödeme için banka bilgilerini gönderir.', degisken: ['MUSTERI_ADI', 'BANKA_ADI', 'HESAP_SAHIBI', 'IBAN_NO', 'IMZA'] },
  { tur: 'odul', ad: 'Sadakat ödülü', ack: 'Ödül hakkı dolan müşteriye gider (müşteri kartından).', degisken: ['MUSTERI_ADI', 'SALON_ADI', 'ODUL', 'IMZA'] },
  { tur: 'mutabakatUst', ad: 'Usta günlük hesap: başlık', ack: 'Ustaya giden günlük hesap mesajının ilk satırları.', degisken: ['USTA_ADI', 'TARIH'] },
  { tur: 'tesvik', ad: 'Usta: ürün satışı yok (teşvik)', ack: 'Ustanın o gün ürün satışı yoksa hesap mesajına eklenir.', degisken: ['USTA_ADI'] },
  { tur: 'tebrik', ad: 'Usta: ürün sattı (tebrik)', ack: 'Ustanın ürün satışı varsa hesap mesajına eklenir.', degisken: ['USTA_ADI'] },
  { tur: 'mutabakatAlt', ad: 'Usta günlük hesap: alt yazı', ack: 'Hesap mesajının son satırları.', degisken: ['USTA_ADI', 'IMZA'] },
  { tur: 'siparis', ad: 'Tedarikçiye sipariş', ack: 'Stok sayfasındaki sipariş listesi mesajı.', degisken: ['SALON_ADI', 'LISTE'] }
];
export const SABLON_ORNEK = { MUSTERI_ADI: 'Ayşe YILMAZ', TARIH: '18.11.2026', SAAT: '14:30', HIZMET: 'Dip boya + fön', ODUL: '%10', USTA_ADI: 'Mehmet', LISTE: '• Wella 6.0 boya — 3 tüp\n• Şampuan — 4 adet', GOOGLE_LINK: 'https://g.page/r/ornek', INSTAGRAM_LINK: 'instagram.com/salonunuz', BANKA_ADI: 'Örnek Banka', HESAP_SAHIBI: 'Ayşe Yılmaz', IBAN_NO: 'TR00 0000 0000 0000 0000 0000 00' };
// Salonun bağlantı ve banka bilgileri (Salon > Genel): {GOOGLE_LINK}, {INSTAGRAM_LINK}, {BANKA_ADI}, {HESAP_SAHIBI}, {IBAN_NO}
let BAG = {};
export const baglantiAyarla = (a) => { BAG = a || {}; };
export const baglantilar = () => ({ ...BAG });
// Mesaj dili: salonun varsayılan şablon dili (Mesaj şablonları > Mesaj dili) ve dil başına salona özel metinler
const DILLER_M = ['tr', 'ru', 'kk', 'de', 'en'];
export const MESAJ_DILLERI = DILLER_M;
let SABLON_DILI = 'tr', DIL_SOR = false;
let OZEL_D = {};   // { dil: { tur: metin } }
export const sablonDili = () => SABLON_DILI;
export const dilSorulsun = () => DIL_SOR;
export const sablonVarsayilan = (tur, dil) => { dil = dil || SABLON_DILI; return dil === 'tr' ? SABLON[tur] : ((SABLON_DIL[dil] && SABLON_DIL[dil][tur]) || SABLON[tur]); };
export const sablonOzel = (dil) => ({ ...(OZEL_D[dil || SABLON_DILI] || {}) });
const temizle = (yeni) => { const o = {}; Object.keys(SABLON).forEach(k => { if (yeni && typeof yeni[k] === 'string' && yeni[k].trim()) o[k] = yeni[k]; }); return o; };
// Türkçe metinler + dil ayarları "mesajlar" belgesindedir; diğer diller "mesajlar_<dil>" belgelerinde
export function sablonOzelAyarla(yeni, dil) {
  dil = dil || 'tr';
  OZEL_D[dil] = temizle(yeni);
  if (dil === 'tr') { SABLON_DILI = yeni && DILLER_M.includes(yeni.sablonDil) ? yeni.sablonDil : 'tr'; DIL_SOR = !!(yeni && yeni.dilSor === true); }
}
export function sablonSifirla() { OZEL_D = {}; SABLON_DILI = 'tr'; DIL_SOR = false; }
export async function sablonlariYukle() {
  sablonSifirla();
  if (!S.salon) return;
  for (const d of DILLER_M) {
    try {
      const x = await getDoc(doc(db, 'salons', S.salon.id, 'ayarlar', d === 'tr' ? 'mesajlar' : 'mesajlar_' + d));
      if (x.exists()) sablonOzelAyarla(x.data(), d);
    } catch (e) { /* okunamazsa hazır metinler */ }
  }
  try {
    const g = await getDoc(doc(db, 'salons', S.salon.id, 'ayarlar', 'genel'));
    baglantiAyarla(g.exists() ? g.data() : {});
  } catch (e) { /* bağlantılar boş kalır */ }
}

export function mesajYap(tur, vars, dil) {
  dil = dil || SABLON_DILI;
  const salon = S.salon ? S.salon.ad : '';
  const v = { SALON_ADI: salon, IMZA: salon, GOOGLE_LINK: BAG.googleLink || '', INSTAGRAM_LINK: BAG.instagram || '', BANKA_ADI: BAG.bankaAdi || '', HESAP_SAHIBI: BAG.hesapSahibi || '', IBAN_NO: BAG.iban || '', ...vars };
  v.USTA_SATIR = v.USTA_ADI ? (USTA_SATIR_ON[dil] || USTA_SATIR_ON.tr) + v.USTA_ADI + '\n' : '';
  return ((OZEL_D[dil] && OZEL_D[dil][tur]) || sablonVarsayilan(tur, dil)).replace(/\{([A-Z_]+)\}/g, (m, k) => (v[k] != null ? v[k] : m));
}

// LUMIO'daki gibi api.whatsapp.com bağlantısı: wa.me yönlendirmesi emojileri bozabiliyordu (� işareti).
// Telefonda aynı sekmede açılır (WhatsApp uygulaması devralır), bilgisayarda yeni sekmede.
export function waLink(tel, metin) {
  const d = String(tel || '').replace(/\D/g, '');
  return 'https://api.whatsapp.com/send/?' + (d ? 'phone=' + d : '') + (metin ? (d ? '&' : '') + 'text=' + encodeURIComponent(metin) : '');
}
export function waAc(tel, metin) {
  const u = waLink(tel, metin);
  if (/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) window.location.href = u;
  else window.open(u, '_blank', 'noopener');
}

// "2026-11-18" -> "18.11.2026"
export function tarihTR(iso) { const p = String(iso || '').split('-'); return p.length === 3 ? p[2] + '.' + p[1] + '.' + p[0] : ''; }

// Doğum günü girişini "GG.AA" biçimine getirir; geçersizse null. Boşsa ''.
export function dogumDuzenle(giris) {
  const s = String(giris || '').trim();
  if (!s) return '';
  const m = /^(\d{1,2})[./\-\s](\d{1,2})(?:[./\-\s]\d{2,4})?$/.exec(s);
  if (!m) return null;
  const g = Number(m[1]), a = Number(m[2]);
  if (g < 1 || g > 31 || a < 1 || a > 12) return null;
  return String(g).padStart(2, '0') + '.' + String(a).padStart(2, '0');
}

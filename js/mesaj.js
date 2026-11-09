// Müşteri mesajları (WhatsApp tek tık). LUMIO'daki şablonların Pro uyarlaması.
// Şablonları salonun kendisinin düzenlemesi 8. teslimde gelecek; şimdilik hazır metinler.
import { S } from './durum.js';

// "AYŞE yılmaz" -> "Ayşe YILMAZ"
export function hitap(isim) {
  const k = String(isim || '').trim().replace(/\s+/g, ' ').split(' ').filter(Boolean);
  if (!k.length) return '';
  const bas = (x) => x.charAt(0).toLocaleUpperCase('tr-TR') + x.slice(1).toLocaleLowerCase('tr-TR');
  if (k.length === 1) return bas(k[0]);
  const soyad = k.pop().toLocaleUpperCase('tr-TR');
  return k.map(bas).join(' ') + ' ' + soyad;
}

const SABLON = {
  takip: '📅 Merhaba Sayın {MUSTERI_ADI},\n\nSon işlemimizin üzerinden geçen süreye istinaden, randevu zamanınızı planlamak adına sizi rahatsız ediyoruz 🌸\n\n⏰ Planlanan Tarih: {TARIH}\n\n📞 Randevunuzu netleştirmek için bu mesaja yanıt vermeniz yeterlidir.\n\nKeyifli günler dileriz! ✨\n{SALON_ADI}',
  dogum: 'Mutlu Yıllar Sayın {MUSTERI_ADI}! 🎂🎉\n\n{SALON_ADI} olarak yeni yaşınızın sağlık, huzur ve bolca ışıltı getirmesini dileriz. 🌸\n\n🎁 Doğum gününüze özel sürpriz bakım hediyeniz salonumuzda sizi bekliyor! Randevunuzu almayı unutmayın.\n\nSevgilerle,\n{SALON_ADI}',
  davet: 'Merhaba Sayın {MUSTERI_ADI}, ☕🌸\n\n{SALON_ADI} olarak bir süredir yokluğunuzu hissediyor, sizi çok özlüyoruz!\n\nHem kendinize hak ettiğiniz ışıltıyı yeniden kazandırmak hem de sıcak bir kahvemiz eşliğinde keyifli bir mola vermek için sizi salonumuza bekliyoruz. ✨\n\nSize en uygun gün ve saati birlikte planlamak için bu mesaja yanıt vermeniz yeterli.\n\nSevgiyle ve güzellikle kalın,\n{SALON_ADI}'
};

export function mesajYap(tur, vars) {
  const v = { SALON_ADI: S.salon ? S.salon.ad : '', ...vars };
  return SABLON[tur].replace(/\{([A-Z_]+)\}/g, (m, k) => (v[k] != null ? v[k] : m));
}

export function waAc(tel, metin) {
  window.open('https://wa.me/' + tel + '?text=' + encodeURIComponent(metin), '_blank', 'noopener');
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

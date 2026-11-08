// Takvim hesapları: ekrandan bağımsız, saf fonksiyonlar (test edilebilir).
// Zaman "günün dakikası" (0-1440) ve tarih "YYYY-MM-DD" olarak tutulur.
// Kilit (slot) = bir ustanın bir günde 5 dakikalık bir dilimi. Bir dilimi aynı anda yalnız bir randevu tutabilir.

export const DILIM = 5;
export const GUN_KODU = ['paz', 'pzt', 'sal', 'car', 'per', 'cum', 'cmt'];

export function dkMetin(dk) {
  const s = Math.floor(dk / 60), d = dk % 60;
  return String(s).padStart(2, '0') + ':' + String(d).padStart(2, '0');
}
export function metinDk(m) {
  const x = /^(\d{1,2}):(\d{2})$/.exec(String(m || ''));
  if (!x) return NaN;
  const s = Number(x[1]), d = Number(x[2]);
  return s > 23 || d > 59 ? NaN : s * 60 + d;
}

export function tarihMetin(d) {
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}
export function metinTarih(s) {
  const x = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s || ''));
  return x ? new Date(Number(x[1]), Number(x[2]) - 1, Number(x[3])) : null;
}
export function tarihEkle(s, n) { const d = metinTarih(s); d.setDate(d.getDate() + n); return tarihMetin(d); }
export function gunKodu(s) { return GUN_KODU[metinTarih(s).getDay()]; }
const AYLAR = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
const GUNAD = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
export function tarihYazi(s) {
  const d = metinTarih(s);
  return d.getDate() + ' ' + AYLAR[d.getMonth()] + ' ' + GUNAD[d.getDay()];
}

// Bir hizmetin "usta çalışıyor" aralıkları. Aşamasızsa tamamı; aşamalıysa yalnız meşgul aşamalar.
export function mesgulAraliklar(hizmet, bas) {
  const as = hizmet.asamalar || [];
  if (!as.length) return [[bas, bas + hizmet.sure]];
  const sonuc = []; let t = bas;
  for (const a of as) {
    if (a.tur !== 'bekleme') sonuc.push([t, t + a.sure]);
    t += a.sure;
  }
  return sonuc;
}

// Aralıkların kapladığı dilim numaraları (tekrarsız, sıralı)
export function dilimler(araliklar) {
  const k = new Set();
  for (const [a, b] of araliklar) for (let i = Math.floor(a / DILIM); i < Math.ceil(b / DILIM); i++) k.add(i);
  return [...k].sort((x, y) => x - y);
}

export const kilitId = (ustaUid, tarih, dilim) => ustaUid + '_' + tarih + '_' + dilim;

export function izinliMi(profil, tarih) {
  return (profil.izinler || []).find(i => i.bas <= tarih && tarih <= i.bit) || null;
}

// Bir usta, bu günde bu aralıklar için uygun mu?
//  'izin'   : planlı izinde ya da haftalık izin günü  -> seçilemez
//  'dolu'   : kilitler başka randevuda                 -> seçilemez
//  'disarda': mesai saatinin dışında                   -> seçilebilir ama uyarılır
//  'ok'     : uygun
export function ustaDurumu(profil, tarih, araliklar, dilimListe, uid, alinmis) {
  const iz = izinliMi(profil, tarih);
  if (iz) return { durum: 'izin', neden: iz.not || '' };
  const m = (profil.mesai || {})[gunKodu(tarih)];
  if (!m || !m.acik) return { durum: 'izin', neden: 'haftalık izin günü' };
  for (const d of dilimListe) if (alinmis.has(kilitId(uid, tarih, d))) return { durum: 'dolu', neden: '' };
  const bas = metinDk(m.bas), bit = metinDk(m.bit);
  if (araliklar.some(([a, b]) => a < bas || b > bit)) return { durum: 'disarda', neden: m.bas + '–' + m.bit };
  return { durum: 'ok', neden: '' };
}

// Randevunun tüm kilit numaraları
export function randevuKilitleri(kalemler, tarih) {
  const k = [];
  kalemler.forEach(x => (x.dilimler || []).forEach(d => k.push(kilitId(x.ustaUid, tarih, d))));
  return k;
}

// Kalem oluştur: hizmet + usta + başlangıç dakikası
export function kalemYap(hizmet, ustaUid, bas) {
  const ar = mesgulAraliklar(hizmet, bas);
  return {
    hizmetId: hizmet.id, ad: hizmet.ad, fiyat: hizmet.fiyat, sure: hizmet.sure, asamalar: hizmet.asamalar || [],
    ustaUid, bas, bit: bas + hizmet.sure, dilimler: dilimler(ar)
  };
}

// Bekleyen bir randevu, izinde/haftalık izinde olan bir ustaya denk geliyor mu? Varsa o kalemleri döndürür.
export function izinCakisanKalemler(randevu, profiller) {
  if (randevu.durum !== 'bekliyor') return [];
  return (randevu.kalemler || []).filter(k => {
    const p = profiller[k.ustaUid];
    return p && izinliMi(p, randevu.tarih);
  });
}

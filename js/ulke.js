// Ülke, para birimi ve telefon biçimi. Yeni ülke eklemek için ULKELER (ve gerekirse PARALAR) listesine satır eklenir.
export const PARALAR = {
  TRY: { sembol: '₺', ondalik: 2, ad: 'Türk lirası' },
  KZT: { sembol: '₸', ondalik: 0, ad: 'Tenge' },
  UZS: { sembol: "so'm", ondalik: 0, ad: "Özbek somu" },
  KGS: { sembol: 'сом', ondalik: 0, ad: 'Kırgız somu' },
  AZN: { sembol: '₼', ondalik: 2, ad: 'Azerbaycan manatı' },
  EUR: { sembol: '€', ondalik: 2, ad: 'Euro' },
  USD: { sembol: '$', ondalik: 2, ad: 'Dolar' },
  RUB: { sembol: '₽', ondalik: 2, ad: 'Rus rublesi' }
};
// kod: telefon ülke kodu, yerel: ülke kodu ve başındaki 0/8 olmadan numara uzunluğu (dizi = olası uzunluklar), sifir: ulusal önek
export const ULKELER = {
  TR: { ad: 'Türkiye', para: 'TRY', kod: '90', yerel: [10], sifir: '0' },
  KZ: { ad: 'Kazakistan', para: 'KZT', kod: '7', yerel: [10], sifir: '8' },
  UZ: { ad: 'Özbekistan', para: 'UZS', kod: '998', yerel: [9], sifir: '' },
  KG: { ad: 'Kırgızistan', para: 'KGS', kod: '996', yerel: [9], sifir: '0' },
  AZ: { ad: 'Azerbaycan', para: 'AZN', kod: '994', yerel: [9], sifir: '0' },
  DE: { ad: 'Almanya', para: 'EUR', kod: '49', yerel: [10, 11], sifir: '0' },
  RU: { ad: 'Rusya', para: 'RUB', kod: '7', yerel: [10], sifir: '8' },
  DIGER: { ad: 'Diğer ülke', para: 'USD', kod: '', yerel: [], sifir: '' }
};
let aktifUlke = 'TR', aktifPara = 'TRY';
export function salonAyarla(salon) {
  aktifUlke = salon && ULKELER[salon.ulke] ? salon.ulke : 'TR';
  aktifPara = salon && PARALAR[salon.para] ? salon.para : (ULKELER[aktifUlke].para);
}
export const ulkeKodu = () => aktifUlke;
export const paraKodu = () => aktifPara;
export const paraBilgi = (kod) => PARALAR[kod || aktifPara] || PARALAR.TRY;
export const sembol = () => paraBilgi().sembol;

// Telefonu rakamlara çevirir (ülke koduyla). "+" ya da 00 ile başlıyorsa olduğu gibi alınır.
// Başında + yoksa salonun ülkesine göre tamamlanır; ülkeye uymuyorsa yaygın biçimler (05.., 8 7xx..) tanınır.
export function telNormalize(giris, ulke) {
  const ham = String(giris || '').trim();
  let d = ham.replace(/\D/g, '');
  let acik = ham.startsWith('+');
  if (d.startsWith('00')) { d = d.slice(2); acik = true; }
  const gecerli = (x) => (x.length >= 10 && x.length <= 15) ? x : '';
  if (acik) return gecerli(d);
  const sirali = [ulke || aktifUlke, 'TR', 'KZ'].filter((u, i, a) => ULKELER[u] && a.indexOf(u) === i);
  for (const kod of sirali) {
    const u = ULKELER[kod];
    if (!u.kod) continue;
    if (d.startsWith(u.kod) && u.yerel.includes(d.length - u.kod.length)) return d;               // zaten ülke koduyla
    if (u.sifir && d.startsWith(u.sifir) && u.yerel.includes(d.length - u.sifir.length)) return u.kod + d.slice(u.sifir.length);
    if (u.yerel.includes(d.length) && (kod !== 'TR' || d.startsWith('5')) && (kod !== 'KZ' || d.startsWith('7'))) return u.kod + d;
  }
  return gecerli(d);
}
export function telGoster(d) {
  d = String(d || '');
  if (/^90\d{10}$/.test(d)) return '0' + d.slice(2, 5) + ' ' + d.slice(5, 8) + ' ' + d.slice(8, 10) + ' ' + d.slice(10);
  if (/^7\d{10}$/.test(d)) return '+7 ' + d.slice(1, 4) + ' ' + d.slice(4, 7) + ' ' + d.slice(7, 9) + ' ' + d.slice(9);
  if (/^998\d{9}$/.test(d)) return '+998 ' + d.slice(3, 5) + ' ' + d.slice(5, 8) + ' ' + d.slice(8, 10) + ' ' + d.slice(10);
  return '+' + d;
}
// Giriş kutusuna yazılacak biçim (telefonu düzenlerken)
export function telGirdi(d) {
  d = String(d || '');
  if (/^90\d{10}$/.test(d)) return '0' + d.slice(2);
  return d ? '+' + d : '';
}

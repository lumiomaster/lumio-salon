// Çok dilli arayüz: metinler t('Türkçe metin') ile yazılır; diğer diller diller/<kod>.js içindeki sözlükten gelir.
// Sözlükte karşılığı olmayan metin Türkçe kalır (hata vermez).
import { sembol } from './ulke.js';

export const DILLER = { tr: 'Türkçe', ru: 'Русский', kk: 'Қазақша', de: 'Deutsch', en: 'English' };
const YEREL = { tr: 'tr-TR', ru: 'ru-RU', kk: 'kk-KZ', de: 'de-DE', en: 'en-GB' };
const SOZLUK = {};
let dil = 'tr';

const oku = () => { try { return localStorage.getItem('lumio-dil'); } catch (e) { return null; } };
export function baslangicDili() {
  const k = oku(); if (k && DILLER[k]) return k;
  const n = ((navigator.language || 'tr').slice(0, 2)).toLowerCase();
  // İngilizce tarayıcıyı otomatik İngilizce yapmıyoruz (Türkiye'de birçok telefon İngilizce); isteyen dil kutusundan seçer
  return (n === 'ru' || n === 'kk' || n === 'de') ? n : 'tr';
}
async function yukle(kod) {
  if (kod === 'tr' || SOZLUK[kod]) return;
  try { SOZLUK[kod] = (await import('./diller/' + kod + '.js')).default || {}; } catch (e) { console.error('dil yüklenemedi', kod, e); SOZLUK[kod] = {}; }
}
// Dili değiştirir ve tarayıcıda hatırlar (her kişi kendi telefonunda seçer)
export async function dilAyarla(kod) {
  if (!DILLER[kod]) kod = 'tr';
  await yukle(kod);
  dil = kod;
  try { localStorage.setItem('lumio-dil', kod); } catch (e) { /* kayıt yok */ }
  try { document.documentElement.lang = kod; } catch (e) { /* yok */ }
}
export const dilKodu = () => dil;
export const yerel = () => YEREL[dil] || 'tr-TR';
export const sozlukte = (kod, metin) => !!(SOZLUK[kod] && SOZLUK[kod][metin]);

export function t(metin, degerler) {
  if (globalThis.__tAnahtar) globalThis.__tAnahtar.add(metin);   // yalnız testlerde: hangi metinler istendi
  let s = (SOZLUK[dil] && SOZLUK[dil][metin]) || metin;
  if (degerler) for (const k in degerler) s = s.split('{' + k + '}').join(degerler[k]);
  if (s.indexOf('₺') >= 0) s = s.split('₺').join(sembol());   // salonun para birimi
  return s;
}

await dilAyarla(baslangicDili());

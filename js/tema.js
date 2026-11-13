// Görünüm: aydınlık / karanlık tema ve yazı boyutu. Her kişi kendi telefonunda seçer (cihazda saklanır, sunucuya gitmez).
// index.html'deki küçük betik aynı kuralı sayfa açılırken uygular (ekran yanıp sönmesin).
export const TEMALAR = ['sistem', 'acik', 'koyu'];
export const YAZILAR = { kucuk: 15, normal: 16, buyuk: 18, cokbuyuk: 20 };
const TA = 'lumio_tema', YA = 'lumio_yazi';
const oku = (k, v) => { try { return localStorage.getItem(k) || v; } catch (e) { return v; } };
const yaz = (k, v) => { try { localStorage.setItem(k, v); } catch (e) { /* özel pencere: bu oturumda geçerli kalır */ } };

export const temaSecimi = () => { const v = oku(TA, 'koyu'); return TEMALAR.includes(v) ? v : 'sistem'; };
export const yaziSecimi = () => { const v = oku(YA, 'normal'); return YAZILAR[v] ? v : 'normal'; };
export const sistemAcikMi = () => { try { return !!(window.matchMedia && matchMedia('(prefers-color-scheme: light)').matches); } catch (e) { return false; } };
export const gecerliTema = (secim) => (secim === 'acik' || (secim === 'sistem' && sistemAcikMi())) ? 'acik' : 'koyu';

export function temaUygula(secim, yazi) {
  const k = document.documentElement;
  k.dataset.tema = gecerliTema(secim || temaSecimi());
  k.style.setProperty('--yazi-boyu', YAZILAR[yazi || yaziSecimi()] + 'px');
  const m = document.querySelector('meta[name=theme-color]');
  if (m) m.setAttribute('content', k.dataset.tema === 'acik' ? '#f4f6fb' : '#0a0e17');
}
export function temaKaydet(v) { if (TEMALAR.includes(v)) { yaz(TA, v); temaUygula(v); } }
export function yaziKaydet(v) { if (YAZILAR[v]) { yaz(YA, v); temaUygula(null, v); } }
export function temaBaslat() {
  temaUygula();
  try { matchMedia('(prefers-color-scheme: light)').addEventListener('change', () => { if (temaSecimi() === 'sistem') temaUygula(); }); } catch (e) { /* eski tarayıcı */ }
}

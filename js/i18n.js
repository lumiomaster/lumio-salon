// Çeviriye hazırlık: metinler t('Türkçe metin') ile yazılır.
// Başka dil eklemek için SOZLUK içine o dilin kodunu ve karşılıklarını ekleyin.
const SOZLUK = {
  // en: { 'Giriş yap': 'Sign in' }
};
let dil = 'tr';
export function dilAyarla(d) { dil = d; }
export function t(metin, degerler) {
  let s = (SOZLUK[dil] && SOZLUK[dil][metin]) || metin;
  if (degerler) for (const k in degerler) s = s.split('{' + k + '}').join(degerler[k]);
  return s;
}

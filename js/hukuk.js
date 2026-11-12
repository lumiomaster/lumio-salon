// Yasal metinler: içerik hukuk-metin.js'de (5 dil). Burada dil seçimi, alanların doldurulması ve gösterim var.
import { t, dilKodu } from './i18n.js';
import { h, pencereAc } from './util.js';
import { S } from './durum.js';
import { SIRKET } from './config.js';
import { HUKUK_METIN } from './hukuk-metin.js';

function doldur(s) {
  const salon = (S.salon && S.salon.ad) || '[SALON]';
  return s.replaceAll('{S}', SIRKET.unvan).replaceAll('{I}', SIRKET.iletisim).replaceAll('{M}', String(SIRKET.saklamaAy)).replaceAll('{SALON}', salon);
}
export function hukukMetni(anahtar) {
  const dil = HUKUK_METIN[dilKodu()] ? dilKodu() : 'tr';
  const m = HUKUK_METIN[dil][anahtar === 'musteri' ? 'musteri' : anahtar];
  return { ad: m.ad, metin: m.metin.map(([b, y]) => [doldur(b), doldur(y)]) };
}
// Salon sahibinin ilk girişte okuyup kabul ettiği metinleri aynı sayfada gösterir
export function hukukGovdesi(anahtar) {
  const m = hukukMetni(anahtar);
  return h('div', { class: 'hukuk' }, h('h3', null, m.ad), m.metin.map(([b, y]) => h('div', null, h('strong', null, b), h('p', null, y))));
}
export function hukukGoster(anahtar) {
  const m = hukukMetni(anahtar);
  const govde = h('div', { class: 'hukuk' }, m.metin.map(([b, y]) => h('div', null, h('strong', null, b), h('p', null, y))));
  const kopya = anahtar === 'musteri' ? h('button', { class: 'dugme ikincil', type: 'button', onclick: async () => {
    const tam = m.ad + '\n\n' + m.metin.map(([b, y]) => b + '\n' + y).join('\n\n');
    try { await navigator.clipboard.writeText(tam); } catch (e) { /* kopyalanamadı */ }
  } }, t('Metni kopyala')) : null;
  pencereAc(m.ad, h('div', { class: 'form' }, govde, kopya));
}

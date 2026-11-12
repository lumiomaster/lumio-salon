import { DILLER, dilKodu, dilAyarla, t } from '../i18n.js';
import { h } from '../util.js';
import { goster } from '../main.js';

// Dil seçimi: her kişi kendi telefonunda seçer, diğerlerini etkilemez
export function dilSecici() {
  const sec = h('select', { 'aria-label': 'Language / Язык / Тіл / Sprache / Dil', class: 'dil-sec',
    onchange: async (e) => { await dilAyarla(e.target.value); goster(); } },
    Object.entries(DILLER).map(([k, ad]) => h('option', { value: k, selected: dilKodu() === k }, ad)));
  return sec;
}
export function dilKarti() {
  return h('div', { class: 'kart' }, h('strong', null, t('Dil')),
    h('p', { class: 'kucuk' }, t('Bu seçim yalnızca bu telefondaki uygulamanın dilini değiştirir.')), dilSecici());
}

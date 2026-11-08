import { t } from '../i18n.js';
import { h } from '../util.js';
import { S } from '../durum.js';
import { goster } from '../main.js';
import { genelEkrani } from './genel.js';
import { hizmetlerEkrani } from './hizmetler.js';
import { ustalarEkrani } from './ustalar.js';

const ALT = [
  { id: 'genel', ad: 'Genel' },
  { id: 'hizmetler', ad: 'Hizmetler' },
  { id: 'ustalar', ad: 'Ustalar' }
];

export function salonEkrani() {
  const ekranlar = { genel: genelEkrani, hizmetler: hizmetlerEkrani, ustalar: ustalarEkrani };
  const ekran = ekranlar[S.salonAlt] || genelEkrani;
  return h('div', { class: 'sayfa' },
    h('h1', null, t('Salon')),
    h('div', { class: 'sekme-cubugu uc' }, ALT.map(a =>
      h('button', { type: 'button', class: a.id === S.salonAlt ? 'secili' : '', onclick: () => { S.salonAlt = a.id; goster(); } }, t(a.ad)))),
    ekran());
}

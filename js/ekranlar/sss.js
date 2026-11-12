// SSS penceresi: arama kutusu, kategori çipleri, rol süzmesi, açılır cevaplar.
import { dilKodu } from '../i18n.js';
import { h, doldur, pencereAc } from '../util.js';
import { S } from '../durum.js';
import { sssYukle, sssAra, rolMaddeleri, KATEGORILER } from '../sss.js';

export async function sssAc(baslangicSorgu = '', acilacak = '') {
  const d = await sssYukle(dilKodu());
  const rol = S.profil && S.profil.rol;
  const tum = rolMaddeleri(rol);
  let kat = '', sorgu = baslangicSorgu;
  const kutu = h('input', { type: 'search', class: 'sss-ara', placeholder: d.ui.ara, value: sorgu, 'aria-label': d.ui.ara });
  const cipler = h('div', { class: 'etiket-satir' });
  const liste = h('div', { class: 'sss-liste' });
  const p = pencereAc('❓ ' + d.ui.baslik, h('div', { class: 'sss' }, kutu, cipler, liste));
  const maddeCiz = (x) => {
    const m = d.m[x.id]; if (!m) return null;
    const det = h('details', { class: 'kart sss-madde', 'data-sss': x.id }, h('summary', null, m[0]), h('p', null, m[1]));
    if (x.id === acilacak) det.open = true;
    return det;
  };
  const ciz = () => {
    doldur(cipler, [['', d.ui.hepsi]].concat(KATEGORILER.filter(k => tum.some(x => x.k === k)).map(k => [k, d.kat[k]])).map(([k, ad]) =>
      h('button', { type: 'button', class: 'chip' + (kat === k ? ' secili' : ''), onclick: () => { kat = k; ciz(); } }, ad)));
    let satirlar;
    if (sorgu.trim()) satirlar = sssAra(sorgu, d, rol).filter(r => !kat || r.k === kat).map(r => tum.find(x => x.id === r.id));
    else satirlar = tum.filter(x => !kat || x.k === kat);
    doldur(liste, satirlar.length ? satirlar.map(maddeCiz) : h('p', { class: 'soluk' }, d.ui.sonuc));
  };
  kutu.addEventListener('input', () => { sorgu = kutu.value; ciz(); });
  ciz();
  return p;
}

export function sssKarti(d) {
  return h('button', { class: 'dugme ikincil', type: 'button', onclick: () => sssAc() }, d.ui.baslik);
}

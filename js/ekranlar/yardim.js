// Yardım: görsel kurulum adımları (iPhone/Android), bildirim açma ve rol bazlı kılavuz.
// Ayrıca ilk girişte (cihaz başına bir kez) açılan 3 adımlı kurulum sihirbazı.
import { dilKodu } from '../i18n.js';
import { h, doldur, pencereAc, bildir, hataMetni, kilitli } from '../util.js';
import { S } from '../durum.js';
import { YARDIM, ROL } from '../yardim-metin.js';
import { bildirimDurumu, bildirimAc } from '../sunucu.js';
import { t } from '../i18n.js';
import { sssAc } from './sss.js';

const Y = () => YARDIM[dilKodu()] || YARDIM.tr;
const SVG = {
  safari: '<circle cx="12" cy="12" r="9"/><path d="M15.5 8.5l-2 5-5 2 2-5z"/>',
  chrome: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3.5"/><path d="M12 8.5h8M9 14l-4 7M15 14l-4 7"/>',
  paylas: '<path d="M12 15V3M8 7l4-4 4 4M6 11H5a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-8a1 1 0 0 0-1-1h-1"/>',
  ekle: '<rect x="4" y="4" width="16" height="16" rx="3"/><path d="M12 8v8M8 12h8"/>',
  nokta: '<circle cx="12" cy="5" r="1.6" fill="currentColor"/><circle cx="12" cy="12" r="1.6" fill="currentColor"/><circle cx="12" cy="19" r="1.6" fill="currentColor"/>',
  yukle: '<path d="M12 4v11M8 11l4 4 4-4M5 20h14"/>',
  onay: '<circle cx="12" cy="12" r="9"/><path d="M8 12.5l3 3 5-6"/>',
  ana: '<path d="M4 11l8-7 8 7v9H4z"/><path d="M10 20v-6h4v6"/>',
  ayar: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M19.1 4.9L17 7M7 17l-2.1 2.1"/>',
  izin: '<rect x="4" y="5" width="16" height="14" rx="3"/><path d="M8 12.5l3 3 5-6"/>',
  sorun: '<circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 16.5v.5"/>',
  zil: '<path d="M6 17h12l-1.5-2v-4a4.5 4.5 0 0 0-9 0v4z"/><path d="M10 20a2 2 0 0 0 4 0"/>'
};
export function ikon(tip) {
  const s = h('span', { class: 'yardim-ikon', 'aria-hidden': 'true' });
  s.innerHTML = '<svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' + (SVG[tip] || SVG.sorun) + '</svg>';
  return s;
}
const adimlar = (liste) => h('div', { class: 'yardim-adimlar' }, liste.map(([tip, metin], i) =>
  h('div', { class: 'yardim-adim' }, ikon(tip), h('div', null, h('small', { class: 'soluk' }, Y().ui.adim + ' ' + (i + 1)), h('p', null, metin)))));

const iosMu = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const kurulu = () => (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true;

function kurulumBolumu() {
  const kutu = h('div', null);
  let plat = iosMu() ? 'ios' : 'and';
  const ciz = () => doldur(kutu,
    kurulu() ? h('div', { class: 'kart bilgi' }, h('p', null, Y().ui.yuklu)) : null,
    h('div', { class: 'sekme-cubugu iki' }, [['ios', Y().ui.iphone], ['and', Y().ui.android]].map(([id, ad]) =>
      h('button', { type: 'button', class: plat === id ? 'secili' : '', onclick: () => { plat = id; ciz(); } }, ad))),
    adimlar(Y()[plat]));
  ciz();
  return kutu;
}

function bildirimBolumu() {
  const kutu = h('div', null);
  const durum = h('p', { class: 'kucuk bildirim-durum' });
  const dugmeAlan = h('div', null);
  const ciz = async () => {
    const d = await bildirimDurumu();
    doldur(dugmeAlan);
    if (d === 'acik') { durum.textContent = '🔔 ' + Y().ui.bildirimAcik; durum.className = 'kucuk bildirim-durum iyi-yazi'; return; }
    if (d === 'ekle') { durum.textContent = Y().ui.iosOnce; durum.className = 'kucuk bildirim-durum uyari-yazi'; return; }
    if (d === 'kapali') {
      const b = h('button', { class: 'dugme', type: 'button', onclick: () => kilitli(b, async () => {
        try { await bildirimAc((m) => { durum.textContent = m; }); bildir(Y().ui.bildirimAcik); } catch (err) {
          const m = (err && err.message) || hataMetni(err); durum.textContent = m; durum.className = 'kucuk bildirim-durum uyari-yazi'; return;
        }
        ciz();
      }) }, Y().ui.bildirimDugme);
      dugmeAlan.append(b);
    }
  };
  kutu.append(adimlar(Y().bild), dugmeAlan, durum);
  ciz();
  return kutu;
}

function kilavuzBolumu(hepsi) {
  const rol = S.profil && S.profil.rol;
  const liste = Y().konular.filter(k => hepsi || !rol || ROL[k.r].includes(rol));
  return h('div', { class: 'yardim-kilavuz' }, liste.map(k =>
    h('details', { class: 'kart yardim-konu' }, h('summary', null, k.b),
      h('p', null, k.y), h('div', { class: 'yardim-neden' }, h('strong', null, Y().ui.neden), h('p', null, k.n)))));
}

export function yardimAc(sekme = 0) {
  const icerik = h('div', null);
  const p = pencereAc(Y().ui.kart, icerik);
  const ciz = () => doldur(icerik,
    h('div', { class: 'sekme-cubugu uc' }, Y().ui.sekmeler.map((ad, i) => h('button', { type: 'button', class: i === sekme ? 'secili' : '', onclick: () => { sekme = i; ciz(); } }, ad))),
    sekme === 0 ? kurulumBolumu() : sekme === 1 ? bildirimBolumu() : kilavuzBolumu(false),
    h('div', { class: 'dugme-satir' }, h('button', { class: 'dugme ikincil', type: 'button', onclick: p.kapat }, '✕')));
  ciz();
}

export function yardimKarti() {
  return h('div', { class: 'kart' }, h('strong', null, Y().ui.kart), h('p', { class: 'soluk' }, Y().ui.kartAlt),
    h('div', { class: 'dugme-satir sol' }, h('button', { class: 'dugme ikincil', type: 'button', onclick: () => yardimAc(0) }, Y().ui.kart), h('button', { class: 'dugme ikincil', type: 'button', onclick: () => sssAc() }, '❓ ' + t('Sık sorulan sorular'))));
}

// ---- İlk giriş sihirbazı ----
const ANAHTAR = (uid) => 'lumio-sihirbaz:' + uid;
export function sihirbazKontrol() {
  try {
    const uid = S.profil && S.profil.id; if (!uid) return;
    if (navigator.webdriver && !localStorage.getItem('lumio-sihirbaz-zorla')) return;   // otomatik testlerde açılmaz
    if (localStorage.getItem(ANAHTAR(uid))) return;
    sihirbazAc(uid);
  } catch (_) { /* depolama yok: sihirbaz atlanır */ }
}
export function sihirbazAc(uid) {
  const sayfalar = 3;
  let sayfa = 0;
  const icerik = h('div', { class: 'sihirbaz' });
  const p = pencereAc(Y().ui.hosgeldin, icerik);
  const bitir = () => { try { if (uid) localStorage.setItem(ANAHTAR(uid), '1'); } catch (_) {} p.kapat(); };
  const ciz = () => {
    const u = Y().ui;
    const govde = sayfa === 0 ? [h('p', null, u.hosgeldinAlt), kurulumBolumu()]
      : sayfa === 1 ? [h('h3', null, u.bildirimBaslik), bildirimBolumu()]
      : [h('h3', null, u.hazir), h('p', null, u.hazirAlt), h('button', { class: 'dugme ikincil', type: 'button', onclick: () => { bitir(); yardimAc(2); } }, u.rolBaslik)];
    doldur(icerik,
      h('div', { class: 'sihirbaz-nokta' }, Array.from({ length: sayfalar }, (_, i) => h('span', { class: i === sayfa ? 'secili' : '' }))),
      ...govde,
      h('div', { class: 'dugme-satir' },
        sayfa > 0 ? h('button', { class: 'dugme ikincil', type: 'button', onclick: () => { sayfa--; ciz(); } }, u.geri) : h('button', { class: 'dugme ikincil', type: 'button', onclick: bitir }, u.atla),
        sayfa < sayfalar - 1 ? h('button', { class: 'dugme', type: 'button', onclick: () => { sayfa++; ciz(); } }, u.ileri) : h('button', { class: 'dugme', type: 'button', onclick: bitir }, u.baslayalim)));
  };
  ciz();
}

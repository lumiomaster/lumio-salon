// Ana sayfa: usta için aylık ilerleme kartı; yönetici/kıdemli/ortak için ay sıralaması ve hedef ayarı
import { t } from '../i18n.js';
import { h, doldur, para } from '../util.js';
import { S } from '../durum.js';
import { auth } from '../fb.js';
import { yetkiliMi } from '../roller.js';
import { oranAyariYukle, donemiYukle, ustaSatirlariniYukle, aralikOdemeleriniYukle, uyeleriYukle } from '../veri.js';
import { tarihMetin } from '../takvim-mantik.js';
import { ayAralik, ayYazi } from '../kar-mantik.js';
import { ayOlculeri, ustaAyi, hedefYazisi } from '../hedef-mantik.js';
import { tesvikAyari } from '../tesvik.js';

const buAy = () => tarihMetin(new Date()).slice(0, 7);

export function hedefKarti() {
  const kutu = h('div', null);
  const rol = S.profil.rol;
  if (yetkiliMi(rol)) yetkiliKart(kutu); else if (rol === 'usta') ustaKart(kutu);
  return kutu;
}

function ustaKart(kutu) {
  const ay = buAy();
  Promise.all([oranAyariYukle(), donemiYukle()]).then(async ([oran, donem]) => {
    const hedefVar = oran.hedefler.length > 0;
    if (!hedefVar && !(oran.caprazYuzde > 0)) return;
    const uid = auth.currentUser.uid;
    const donemler = [donem, donem - 1, donem - 2].filter(d => d >= 0);
    const l = (await Promise.all(donemler.map(d => ustaSatirlariniYukle(d, uid).catch(() => [])))).flat();
    const satirlar = l.map(x => ({ ...x, durum: x.durum, tarih: x.tarih }));
    const bu = (ayOlculeri(satirlar, ay)[uid]) || { urun: 0, capraz: 0 };
    const a = ustaAyi(bu, oran.hedefler);
    if (!hedefVar && bu.capraz === 0 && bu.urun === 0) return;
    doldur(kutu, h('div', { class: 'kart bilgi' },
      h('strong', null, '🎯 ' + ayYazi(ay)),
      h('div', { class: 'hesap-satir' }, h('span', null, t('Ürün satışı')), h('span', null, para(a.urun.deger))),
      a.urun.sonraki ? h('div', { class: 'kucuk' }, t('Sonraki hedef {hedef} ₺ ({odul}) — {kalan} kaldı', { hedef: String(a.urun.sonraki.esik).replace('.', ','), odul: hedefYazisi(a.urun.sonraki), kalan: para(a.urun.kalan) })) : null,
      h('div', { class: 'hesap-satir' }, h('span', null, t('Çapraz satış')), h('span', null, para(a.capraz.deger))),
      a.capraz.sonraki ? h('div', { class: 'kucuk' }, t('Sonraki hedef {hedef} ₺ ({odul}) — {kalan} kaldı', { hedef: String(a.capraz.sonraki.esik).replace('.', ','), odul: hedefYazisi(a.capraz.sonraki), kalan: para(a.capraz.kalan) })) : null,
      a.ikramiye > 0 ? h('div', { class: 'hesap-satir ust-cizgi' }, h('span', null, t('Şu an hak edilen ikramiye')), h('strong', null, para(a.ikramiye))) : null,
      oran.caprazYuzde > 0 ? h('p', { class: 'kucuk' }, t('Başka ustanın müşterisine sattığınız ek hizmetlerden %{o} prim kazanırsınız.', { o: String(oran.caprazYuzde).replace('.', ',') })) : null));
  }).catch(() => {});
}

function yetkiliKart(kutu) {
  const ay = buAy();
  const yenile = () => Promise.all([oranAyariYukle(true), uyeleriYukle(), aralikOdemeleriniYukle(ayAralik(ay).bas, ayAralik(ay).bit)]).then(([oran, uyeler, odemeler]) => {
    const m = ayOlculeri(odemeler, ay);
    const ad = (uid) => (uyeler.find(u => u.id === uid) || { ad: t('Eski çalışan') }).ad;
    const sirala = (alan) => Object.entries(m).filter(([, v]) => v[alan] > 0).sort((a, b) => b[1][alan] - a[1][alan]).slice(0, 3);
    const urun = sirala('urun'), capraz = sirala('capraz');
    const liste = (baslik, l, alan) => l.length ? h('div', null, h('div', { class: 'kucuk' }, baslik),
      l.map(([uid, v], i) => h('div', { class: 'hesap-satir' }, h('span', null, ['🥇', '🥈', '🥉'][i] + ' ' + ad(uid)), h('span', null, para(v[alan]))))) : null;
    const hedefler = oran.hedefler.length;
    if (!urun.length && !capraz.length && !hedefler) {
      doldur(kutu, h('div', { class: 'kart bilgi' }, h('strong', null, '🏆 ' + t('Ustaları teşvik edin')),
        h('p', { class: 'kucuk' }, t('Aylık ürün satışı ve çapraz satış hedefleri koyabilirsiniz.')),
        h('button', { class: 'dugme ikincil kucuk-dugme', type: 'button', onclick: () => tesvikAyari(yenile) }, t('Hedefleri ayarla'))));
      return;
    }
    doldur(kutu, h('div', { class: 'kart bilgi' }, h('strong', null, '🏆 ' + ayYazi(ay) + ' ' + t('sıralaması')),
      liste(t('En çok ürün satan'), urun, 'urun'),
      liste(t('En çok çapraz satış yapan'), capraz, 'capraz'),
      !urun.length && !capraz.length ? h('p', { class: 'kucuk' }, t('Bu ay henüz ürün ya da çapraz satış yok.')) : null,
      h('div', { class: 'dugme-satir sol' }, h('button', { class: 'dugme ikincil kucuk-dugme', type: 'button', onclick: () => tesvikAyari(yenile) }, t('Hedefleri ayarla')))));
  }).catch(() => {});
  yenile();
}

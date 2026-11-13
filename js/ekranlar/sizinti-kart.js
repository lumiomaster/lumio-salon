// Ana sayfa: para sızıntısı alarmı (yalnız yönetici, kıdemli, ortak). Sorun yoksa görünmez.
import { t } from '../i18n.js';
import { h, doldur, para, pencereAc } from '../util.js';
import { S } from '../durum.js';
import { yetkiliMi } from '../roller.js';
import { ustalariYukle, urunleriYukle, aralikOdemeleriniYukle, aralikIslemleriniYukle, uyeleriYukle } from '../veri.js';
import { tarihMetin } from '../takvim-mantik.js';
import { ayAralik } from '../kar-mantik.js';
import { sizintiTara, SIZINTI_ESIK } from '../sizinti-mantik.js';

export function sizintiKarti() {
  const kutu = h('div', null);
  if (!S.profil || !yetkiliMi(S.profil.rol)) return kutu;
  const ay = tarihMetin(new Date()).slice(0, 7), { bas, bit } = ayAralik(ay);
  Promise.all([aralikOdemeleriniYukle(bas, bit), aralikIslemleriniYukle(bas, bit), ustalariYukle(), urunleriYukle(), uyeleriYukle().catch(() => [])]).then(([odemeler, islemler, u, urunler, uyeler]) => {
    const liste = sizintiTara({ odemeler, mali: u.mali, islemler, urunler });
    if (!liste.length) return;
    const ad = (uid) => { const x = uyeler.find(y => y.id === uid); return x ? x.ad : (uid ? t('Eski çalışan') : ''); };
    const dusuk = liste.filter(x => x.tur === 'dusuk').length, sifir = liste.filter(x => x.tur === 'sifir').length, zarar = liste.filter(x => x.tur === 'zarar').length;
    const satirlar = [];
    if (dusuk) satirlar.push(t('{n} işlemde salona kalan pay %{e} altında', { n: dusuk, e: SIZINTI_ESIK }));
    if (sifir) satirlar.push(t('{n} kalem sıfır fiyatla satılmış', { n: sifir }));
    if (zarar) satirlar.push(t('{n} ürün alış fiyatının altında satılmış', { n: zarar }));
    doldur(kutu, h('div', { class: 'kart uyari sizinti' }, h('strong', null, t('Para sızıntısı uyarısı (bu ay)')),
      h('ul', { class: 'kucuk' }, satirlar.map(s => h('li', null, s))),
      h('button', { class: 'dugme ikincil kucuk-dugme', type: 'button', onclick: () => ayrinti(liste, ad) }, t('Ayrıntıyı gör'))));
  }).catch(() => {});
  return kutu;
}

function ayrinti(liste, ad) {
  const icerik = h('div', null,
    h('p', { class: 'kucuk' }, t('Salonda kalan = ödenen tutar − kart komisyonu − usta hakedişi − kullanılan malzeme. Nedenini bulup fiyatı, usta yüzdesini ya da malzeme girişini düzeltin.')),
    liste.slice(0, 40).map(x => h('div', { class: 'kart' },
      h('div', { class: 'uye-ust' }, h('strong', null, x.ad || '—'), h('span', { class: 'kucuk soluk' }, x.tarih)),
      h('div', { class: 'kucuk soluk' }, [x.musteriAd, ad(x.ustaUid)].filter(Boolean).join(' · ')),
      x.tur === 'sifir' ? h('div', { class: 'uyari-yazi' }, t('Fiyat sıfır girilmiş.')) :
      x.tur === 'zarar' ? h('div', null, h('div', { class: 'hesap-satir' }, h('span', null, t('Satış')), h('span', null, para(x.tutar))), h('div', { class: 'hesap-satir' }, h('span', null, t('Alış maliyeti')), h('span', null, para(x.maliyet))), h('div', { class: 'hesap-satir' }, h('strong', null, t('Zarar')), h('strong', { class: 'eksi' }, para(x.salon)))) :
      h('div', null,
        h('div', { class: 'hesap-satir' }, h('span', null, t('Ödenen')), h('span', null, para(x.tutar))),
        h('div', { class: 'hesap-satir' }, h('span', null, t('Usta hakedişi')), h('span', null, '− ' + para(x.usta))),
        x.maliyet > 0 ? h('div', { class: 'hesap-satir' }, h('span', null, t('Malzeme')), h('span', null, '− ' + para(x.maliyet))) : null,
        h('div', { class: 'hesap-satir' }, h('strong', null, t('Salonda kalan')), h('strong', { class: x.salon < 0 ? 'eksi' : '' }, para(x.salon) + ' (%' + x.oran + ')'))))),
    liste.length > 40 ? h('p', { class: 'kucuk soluk' }, t('İlk 40 kayıt gösteriliyor.')) : null);
  pencereAc(t('Para sızıntısı uyarısı (bu ay)'), icerik);
}

// Ana sayfa (yönetici, kıdemli, ortak): "Bu ay uygulama sayesinde" ve usta bağımlılığı kartları. Veri yoksa görünmez.
import { t } from '../i18n.js';
import { h, doldur, para, pencereAc } from '../util.js';
import { S } from '../durum.js';
import { yetkiliMi } from '../roller.js';
import { aralikOdemeleriniYukle, mesajKayitlariniYukle, uyeleriYukle } from '../veri.js';
import { tarihMetin, tarihEkle } from '../takvim-mantik.js';
import { ayAralik } from '../kar-mantik.js';
import { geriKazanim, ustaBagimliligi, GERI_PENCERE } from '../deger-mantik.js';

export function degerKarti() {
  const kutu = h('div', null);
  if (!S.profil || !yetkiliMi(S.profil.rol)) return kutu;
  const { bas, bit } = ayAralik(tarihMetin(new Date()).slice(0, 7)), once = tarihEkle(bas, -GERI_PENCERE);
  Promise.all([aralikOdemeleriniYukle(once, bit), mesajKayitlariniYukle(once)]).then(([odemeler, mesajlar]) => {
    const g = geriKazanim({ mesajlar, odemeler, bas, bit });
    if (!g.adet) return;
    doldur(kutu, h('div', { class: 'kart deger' }, h('strong', null, t('Bu ay uygulama sayesinde')),
      h('div', { class: 'hesap-satir' }, h('span', null, t('Davetten sonra geri gelen müşteri')), h('span', null, g.adet + ' · ' + para(g.tutar))),
      h('p', { class: 'kucuk soluk' }, t('"Sizi özledik" mesajından sonra {n} gün içinde gelip ödeme yapan müşteriler. Tutar gerçekten ödenen tutardır.', { n: GERI_PENCERE })),
      h('button', { class: 'dugme ikincil kucuk-dugme', type: 'button', onclick: () => geriAyrinti(g) }, t('Kimler?'))));
  }).catch(() => {});
  return kutu;
}

function geriAyrinti(g) {
  pencereAc(t('Davetten sonra geri gelenler'), h('div', null, g.liste.map(x => h('div', { class: 'kart' },
    h('div', { class: 'uye-ust' }, h('strong', null, x.musteriAd || '—'), h('strong', null, para(x.tutar))),
    h('div', { class: 'kucuk soluk' }, t('Davet') + ': ' + x.davetGun + ' · ' + t('Geldi') + ': ' + x.odemeGun)))));
}

// ---- Usta bağımlılığı ----
const AY = 6, ESIK = 15;   // son 6 ay; riskli ciro %15'i geçerse kart görünür
const onbellekAnahtar = () => 'bagimlilik:' + (S.salon ? S.salon.id : '') + ':' + tarihMetin(new Date());
const oku = () => { try { return JSON.parse(localStorage.getItem(onbellekAnahtar()) || 'null'); } catch (e) { return null; } };
const yaz = (v) => { try { Object.keys(localStorage).filter(k => k.startsWith('bagimlilik:') && k !== onbellekAnahtar()).forEach(k => localStorage.removeItem(k)); localStorage.setItem(onbellekAnahtar(), JSON.stringify(v)); } catch (e) { /* kayıt yok */ } };

export function bagimlilikKarti() {
  const kutu = h('div', null);
  if (!S.profil || !yetkiliMi(S.profil.rol)) return kutu;
  const goster = (r, uyeler) => {
    if (!r || r.musteri < 5 || r.oranCiro < ESIK) return;
    const ad = (uid) => { const x = uyeler.find(y => y.id === uid); return x ? x.ad : t('Eski çalışan'); };
    doldur(kutu, h('div', { class: 'kart uyari' }, h('strong', null, t('Usta bağımlılığı')),
      h('p', null, t('Düzenli gelen müşterilerinizin %{o}\'i (ciro payı %{c}) tek bir ustaya bağlı.', { o: r.oranMusteri, c: r.oranCiro })),
      h('button', { class: 'dugme ikincil kucuk-dugme', type: 'button', onclick: () => bagAyrinti(r, ad) }, t('Ustalara göre gör'))));
  };
  const onb = oku();
  uyeleriYukle().catch(() => []).then(async (uyeler) => {
    if (onb) return goster(onb, uyeler);
    const bit = tarihMetin(new Date()), bas = tarihEkle(bit, -30 * AY);
    const odemeler = await aralikOdemeleriniYukle(bas, bit);
    const ilk = odemeler.reduce((a, o) => (o.tarih && o.tarih < a ? o.tarih : a), bit);
    const r = ilk <= tarihEkle(bit, -90) ? ustaBagimliligi({ odemeler }) : { musteri: 0, oranCiro: 0 };   // 3 aydan az veriyle gösterilmez
    yaz(r); goster(r, uyeler);
  }).catch(() => {});
  return kutu;
}

function bagAyrinti(r, ad) {
  pencereAc(t('Usta bağımlılığı'), h('div', null,
    h('p', { class: 'kucuk' }, t('Son {a} ayda en az 3 kez gelen ve hizmet cirosunun %80\'inden fazlası aynı ustada olan müşteriler "bağlı" sayılır. Usta ayrılırsa bu müşterilerin gitme riski yüksektir.', { a: AY })),
    r.ustalar.map(u => h('div', { class: 'kart' },
      h('div', { class: 'uye-ust' }, h('strong', null, ad(u.uid)), h('span', null, u.musteri + ' ' + t('müşteri'))),
      h('div', { class: 'hesap-satir' }, h('span', null, t('Risk altındaki ciro')), h('span', null, para(u.ciro) + ' (%' + u.oranCiro + ')')))),
    h('p', { class: 'kucuk soluk' }, t('Önlem: bu müşterileri ikinci bir ustayla da tanıştırın, formül ve müşteri notlarını güncel tutun (kayıtlar salona aittir).'))));
}

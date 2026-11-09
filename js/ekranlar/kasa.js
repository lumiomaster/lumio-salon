import { t } from '../i18n.js';
import { h, doldur, hataMetni, bildir, kilitli, para, pencereAc, lisansDurumu } from '../util.js';
import { S } from '../durum.js';
import { gorenMi, odemeYazarMi, yetkiliMi } from '../roller.js';
import { auth, db, doc, collection, writeBatch, serverTimestamp } from '../fb.js';
import { uyeleriYukle, gunOdemeleriniYukle, randevulariYukle, donemiYukle } from '../veri.js';
import { tarihMetin, tarihEkle, tarihYazi, dkMetin } from '../takvim-mantik.js';
import { gunOzeti } from '../kasa-mantik.js';
import { goster } from '../main.js';
import { odemeFormu } from './odeme-formu.js';
import { iptalFormu } from './takvim.js';
import { hesapEkrani } from './hesap.js';
import { kazancimEkrani } from './kazancim.js';

const K = { tarih: tarihMetin(new Date()) };

export function kasaEkrani() {
  const rol = S.profil.rol;
  if (rol === 'usta') return kazancimEkrani();
  const hesapVar = gorenMi(rol);
  const alt = hesapVar && S.kasaAlt === 'hesap' ? 'hesap' : 'gun';
  return h('div', { class: 'sayfa' },
    h('h1', null, t('Kasa')),
    hesapVar ? h('div', { class: 'sekme-cubugu' },
      [['gun', 'Günlük kasa'], ['hesap', 'Usta hesapları']].map(([id, ad]) =>
        h('button', { type: 'button', class: id === alt ? 'secili' : '', onclick: () => { S.kasaAlt = id; goster(); } }, t(ad)))) : null,
    alt === 'hesap' ? hesapEkrani() : gunEkrani());
}

function gunEkrani() {
  const kutu = h('div', null, h('p', { class: 'soluk' }, t('Yükleniyor…')));
  const yenile = () => yukle(kutu, yenile);
  yenile();
  return kutu;
}

async function yukle(kutu, yenile) {
  try {
    const bugun = tarihMetin(new Date());
    const [uyeler, odemeler, bekleyen, donem] = await Promise.all([
      uyeleriYukle(), gunOdemeleriniYukle(K.tarih), randevulariYukle(tarihEkle(bugun, -14), bugun), donemiYukle()
    ]);
    ciz(kutu, uyeler, odemeler, bekleyen.filter(r => r.durum === 'bekliyor'), donem, yenile);
  } catch (e) {
    console.error(e);
    kutu.replaceChildren(h('div', { class: 'uyari' }, hataMetni(e)), h('button', { class: 'dugme ikincil', type: 'button', onclick: yenile }, t('Tekrar dene')));
  }
}

const saat = (z) => { if (!z || !z.toMillis) return ''; const d = new Date(z.toMillis()); return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); };

function ciz(kutu, uyeler, odemeler, bekleyen, donem, yenile) {
  const rol = S.profil.rol;
  const yazar = odemeYazarMi(rol) && lisansDurumu(S.salon).aktif;
  const ad = (uid) => (uyeler.find(x => x.id === uid) || { ad: '?' }).ad;
  const z = gunOzeti(odemeler);
  const bugun = tarihMetin(new Date());
  doldur(kutu,
    bekleyen.length ? h('div', { class: 'kart uyari' },
      h('strong', null, t('⚠ Ödemesi alınmamış {n} randevu var', { n: bekleyen.length })),
      h('p', { class: 'kucuk' }, t('Müşteri geldiyse ödemeyi alın; gelmediyse randevuyu iptal edin.')),
      bekleyen.map(r => h('div', { class: 'arama-satir' },
        h('div', null, h('strong', null, r.musteriAd), h('div', { class: 'kucuk' }, tarihYazi(r.tarih) + ' ' + dkMetin(r.bas) + ' · ' + r.kalemler.map(k => k.ad).join(', '))),
        yazar ? h('div', { class: 'arama-dugmeler' },
          h('button', { class: 'dugme kucuk-dugme', type: 'button', onclick: () => odemeFormu(r, yenile) }, t('Öde')),
          h('button', { class: 'dugme ikincil kucuk-dugme', type: 'button', onclick: () => iptalFormu(r, { ad }, yenile) }, t('İptal'))) : null))) : null,
    h('div', { class: 'baslik-satir' }, h('h2', { class: 'ilk' }, t('Günlük kasa')),
      yazar ? h('button', { class: 'dugme kucuk-dugme', type: 'button', onclick: () => odemeFormu(null, yenile) }, t('+ Ürün satışı')) : null),
    h('div', { class: 'tarih-cubugu' },
      h('button', { class: 'ikon-dugme', type: 'button', 'aria-label': t('Önceki gün'), onclick: () => { K.tarih = tarihEkle(K.tarih, -1); yenile(); } }, '‹'),
      h('input', { type: 'date', value: K.tarih, onchange: (e) => { if (e.target.value) { K.tarih = e.target.value; yenile(); } } }),
      h('button', { class: 'ikon-dugme', type: 'button', 'aria-label': t('Sonraki gün'), onclick: () => { K.tarih = tarihEkle(K.tarih, 1); yenile(); } }, '›')),
    h('div', { class: 'tarih-yazi' }, tarihYazi(K.tarih), K.tarih === bugun ? h('span', { class: 'rozet' }, t('Bugün')) : h('button', { class: 'baglanti', type: 'button', onclick: () => { K.tarih = bugun; yenile(); } }, t('Bugüne git'))),
    h('div', { class: 'kart kasa-ozet' },
      h('div', { class: 'uye-ust' }, h('span', null, t('Nakit (kasada)')), h('strong', { class: 'nakit-toplam' }, para(z.nakit))),
      h('div', { class: 'uye-ust' }, h('span', null, t('Kart')), h('strong', null, para(z.kart))),
      z.komisyon > 0 ? h('div', { class: 'uye-ust kucuk' }, h('span', null, t('Kart komisyonu')), h('span', null, '− ' + para(z.komisyon))) : null,
      h('div', { class: 'uye-ust ust-cizgi' }, h('span', null, t('Net toplam')), h('strong', null, para(z.net))),
      h('div', { class: 'kucuk' }, t('{n} ödeme', { n: z.adet }))),
    odemeler.length === 0 ? h('p', { class: 'soluk' }, t('Bu gün ödeme yok.')) : null,
    odemeler.map(o => h('button', { class: 'kart odeme' + (o.durum === 'iptal' ? ' iptal' : ''), type: 'button', onclick: () => odemeAyrinti(o, ad, donem, yenile) },
      h('div', { class: 'uye-ust' }, h('strong', null, o.musteriAd || (o.rid ? t('Randevu') : t('Satış'))), h('strong', null, para(o.toplam))),
      h('div', { class: 'uye-alt kucuk' },
        h('span', null, saat(o.zaman) + ' · ' + (o.yontem === 'kart' ? t('Kart') : t('Nakit')) + ' · ' + o.kalemler.map(k => k.ad).join(', ')),
        o.durum === 'iptal' ? h('span', { class: 'rozet pasif-rozet' }, t('İptal')) : null))));
}

function odemeAyrinti(o, ad, donem, yenile) {
  const icerik = h('div', null);
  const p = pencereAc(t('Ödeme'), icerik);
  const iptalEdebilir = yetkiliMi(S.profil.rol) && o.durum === 'gecerli' && o.donem === donem && lisansDurumu(S.salon).aktif;
  doldur(icerik,h('div', { class: 'ayrinti' },
    h('div', null, h('strong', null, o.musteriAd || t('Satış')), o.durum === 'iptal' ? h('span', { class: 'rozet pasif-rozet' }, t('İptal')) : null),
    h('div', { class: 'soluk' }, tarihYazi(o.tarih) + ' ' + saat(o.zaman) + ' · ' + (o.yontem === 'kart' ? t('Kart') : t('Nakit'))),
    h('div', { class: 'kalemler' }, o.kalemler.map(k => h('div', { class: 'kalem' },
      h('div', { class: 'uye-ust' }, h('strong', null, k.ad + (k.tur === 'urun' ? ' (' + t('ürün') + ')' : '')), h('span', null, para(k.tutar))),
      h('div', { class: 'kucuk' }, k.ustaUid ? ad(k.ustaUid) : t('Salon'))))),
    o.komisyon > 0 ? h('div', { class: 'uye-ust kucuk' }, h('span', null, t('Kart komisyonu')), h('span', null, '− ' + para(o.komisyon))) : null,
    h('div', { class: 'uye-ust' }, h('span', { class: 'soluk' }, t('Toplam')), h('strong', null, para(o.toplam))),
    o.iptalNedeni ? h('p', { class: 'kucuk' }, t('İptal nedeni: ') + o.iptalNedeni) : null,
    h('p', { class: 'kucuk' }, t('Ödemeyi alan: ') + ad(o.alan))),
    iptalEdebilir ? h('div', { class: 'dugme-satir' }, h('button', { class: 'dugme ikincil', type: 'button', onclick: () => { p.kapat(); odemeIptal(o, yenile); } }, t('Ödemeyi iptal et'))) : null,
    !iptalEdebilir && o.durum === 'gecerli' && o.donem !== donem ? h('p', { class: 'kucuk' }, t('Bu ödeme kapanmış bir döneme ait, iptal edilemez.')) : null);
}

function odemeIptal(o, yenile) {
  const neden = h('input', { type: 'text', maxlength: 100, placeholder: t('İptal nedeni') });
  const hata = h('div', { class: 'hata', role: 'alert' });
  const dugme = h('button', { class: 'dugme', type: 'submit' }, t('Ödemeyi iptal et'));
  const icerik = h('div', null);
  const p = pencereAc(t('Ödemeyi iptal et'), icerik);
  icerik.append(h('form', { class: 'form', novalidate: true,
    onsubmit: (e) => {
      e.preventDefault(); hata.textContent = '';
      if (neden.value.trim().length < 3) { hata.textContent = t('İptal nedenini yazın.'); return; }
      kilitli(dugme, async () => {
        try {
          const b = writeBatch(db);
          b.update(doc(db, 'salons', S.salon.id, 'odemeler', o.id), { durum: 'iptal', iptalNedeni: neden.value.trim() });
          if (o.rid) b.update(doc(db, 'salons', S.salon.id, 'randevular', o.rid), { durum: 'bekliyor', odemeId: '', guncelleme: serverTimestamp() });
          b.set(doc(collection(db, 'salons', S.salon.id, 'kayitlar')), { uid: auth.currentUser.uid, islem: 'odeme_iptal', hedef: o.id, ayrinti: o.toplam + ' ₺: ' + neden.value.trim(), zaman: serverTimestamp() });
          await b.commit(); p.kapat(); bildir(t('Ödeme iptal edildi.')); yenile();
        } catch (err) { console.error(err); hata.textContent = hataMetni(err); }
      });
    } },
    h('p', null, t('{tutar} tutarındaki ödeme iptal edilir. Randevuya bağlıysa randevu yeniden "ödeme bekliyor" olur.', { tutar: para(o.toplam) })),
    neden, hata, dugme));
}

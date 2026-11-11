import { t } from '../i18n.js';
import { h, hataMetni, bildir, kilitli, para, sayi, pencereAc } from '../util.js';
import { S } from '../durum.js';
import { auth, db, doc, collection, writeBatch, serverTimestamp } from '../fb.js';
import { uyeleriYukle, ustalariYukle, ayariYukle, donemiYukle, hizmetleriYukle } from '../veri.js';
import { yuvarla } from '../kasa-mantik.js';
import { tarihYazi } from '../takvim-mantik.js';

// Alınmış bir ödemeye sonradan unutulan hizmeti ekler ("düzeltme ödemesi").
// Eski ödeme değişmez; aynı gün ve aynı müşteri için yeni bir ödeme belgesi eklenir, usta hesabına ve mutabakata yansır.
export async function hizmetDuzeltmesi(o, bitti) {
  let uyeler, u, hizmetler, ayar;
  try { [uyeler, u, hizmetler, ayar] = await Promise.all([uyeleriYukle(), ustalariYukle(), hizmetleriYukle(), ayariYukle(true)]); }
  catch (e) { console.error(e); bildir(hataMetni(e), 'hata'); return; }
  hizmetler = hizmetler.filter(x => x.aktif);
  const ustalar = uyeler.filter(x => x.aktif && u.profil[x.id] && u.profil[x.id].calisir);
  const ilkUsta = (o.kalemler.find(k => k.ustaUid) || {}).ustaUid || (ustalar[0] ? ustalar[0].id : '');
  let yontem = o.yontem;
  const hizSec = h('select', { 'aria-label': t('Hizmet') }, h('option', { value: '' }, t('Hizmet seçin…')), hizmetler.map(x => h('option', { value: x.id }, x.ad)));
  const ustaSec = h('select', { 'aria-label': t('Usta') }, ustalar.map(x => h('option', { value: x.id, selected: x.id === ilkUsta }, x.ad)));
  const tutar = h('input', { type: 'text', inputmode: 'decimal', placeholder: '0' });
  hizSec.addEventListener('change', () => { const hz = hizmetler.find(x => x.id === hizSec.value); if (hz) tutar.value = String(hz.fiyat || 0).replace('.', ','); });
  const yontemKutu = h('div', { class: 'sekme-cubugu' });
  const cizYontem = () => { yontemKutu.replaceChildren(...['nakit', 'kart'].map(y => h('button', { type: 'button', class: y === yontem ? 'secili' : '', onclick: () => { yontem = y; cizYontem(); } }, y === 'nakit' ? t('Nakit') : t('Kart')))); };
  cizYontem();
  const hata = h('div', { class: 'hata', role: 'alert' });
  const dugme = h('button', { class: 'dugme', type: 'submit' }, t('Hizmeti ekle'));
  const icerik = h('div', null);
  const p = pencereAc(t('Hizmet ekle (düzeltme)'), icerik);
  icerik.append(h('form', { class: 'form', novalidate: true,
    onsubmit: (e) => {
      e.preventDefault(); hata.textContent = '';
      const hz = hizmetler.find(x => x.id === hizSec.value);
      if (!hz) { hata.textContent = t('Hizmeti seçin.'); return; }
      if (!ustaSec.value) { hata.textContent = t('Ustayı seçin.'); return; }
      const v = sayi(tutar.value);
      if (!Number.isFinite(v) || v <= 0) { hata.textContent = t('Tutarı yazın.'); return; }
      kilitli(dugme, async () => {
        try {
          const donem = await donemiYukle();
          if (donem !== o.donem) { hata.textContent = t('Bu ödeme kapanmış bir döneme ait.'); return; }
          const ayarT = await ayariYukle(true);
          const oran = yontem === 'kart' && ayarT ? ayarT.posOrani : 0;
          const top = yuvarla(v), kom = yuvarla(top * oran / 100);
          const kalem = { ustaUid: ustaSec.value, ad: hz.ad, tutar: top, alis: 0, tur: 'hizmet', ek: true, ...(hz.oranGrup ? { grup: hz.oranGrup } : {}) };
          const tarih = o.tarih;
          const b = writeBatch(db);
          const ref = doc(collection(db, 'salons', S.salon.id, 'odemeler'));
          b.set(ref, { rid: o.rid || '', musteriId: o.musteriId || '', tarih, donem, yontem, musteriAd: o.musteriAd || '', kalemler: [kalem], ustalar: [kalem.ustaUid],
            toplam: top, komisyonOrani: oran, komisyon: kom, durum: 'gecerli', alan: auth.currentUser.uid, zaman: serverTimestamp(), duzeltmeOf: o.id });
          b.set(doc(collection(db, 'salons', S.salon.id, 'ustaSatirlari')), { ustaUid: kalem.ustaUid, odemeId: ref.id, tarih, donem, musteriAd: o.musteriAd || '', ad: kalem.ad, tutar: top, alis: 0, tur: 'hizmet', ...(kalem.grup ? { grup: kalem.grup } : {}), yontem, komisyonOrani: oran, durum: 'gecerli' });
          b.set(doc(collection(db, 'salons', S.salon.id, 'kayitlar')), { uid: auth.currentUser.uid, islem: 'odeme_duzeltme', hedef: ref.id, ayrinti: (o.musteriAd || '') + ' ' + tarih + ': +' + hz.ad + ' ' + top + ' ₺', zaman: serverTimestamp() });
          await b.commit(); p.kapat(); bildir(t('Hizmet eklendi')); bitti();
        } catch (err) { console.error(err); hata.textContent = hataMetni(err); }
      });
    } },
    h('p', { class: 'kucuk' }, t('{ad}, {gun} günü ödemesine unutulan hizmeti ekler. Eski ödeme değişmez; usta hesabına ve o günün mutabakatına yansır.', { ad: o.musteriAd || t('Satış'), gun: tarihYazi(o.tarih) })),
    h('label', null, t('Hizmet'), hizSec), h('label', null, t('Usta'), ustaSec), h('label', null, t('Tutar (₺)'), tutar),
    h('h3', null, t('Ödeme yöntemi')), yontemKutu, hata, dugme));
}

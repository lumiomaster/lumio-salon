// Sadakat ayarı penceresi (yönetici/kıdemli/ortak) — Salon > Genel'den açılır
import { t } from './i18n.js';
import { h, doldur, hataMetni, bildir, kilitli, sayi, pencereAc } from './util.js';
import { S } from './durum.js';
import { auth, db, doc, collection, writeBatch, serverTimestamp } from './fb.js';
import { sadakatAyariYukle, sadakatOnbellekSil } from './veri.js';
import { sadakatNormalle } from './sadakat-mantik.js';
import { sembol } from './ulke.js';

export async function sadakatAyari(sonra) {
  const icerik = h('div', null, h('p', { class: 'soluk' }, t('Yükleniyor…')));
  const p = pencereAc(t('Sadakat ödülü'), icerik);
  let a;
  try { a = await sadakatAyariYukle(true); } catch (e) { console.error(e); doldur(icerik, h('div', { class: 'uyari' }, hataMetni(e))); return; }
  const acik = h('input', { type: 'checkbox', id: 'sadakat-acik', checked: a.acik });
  const olcu = h('select', null,
    [['ziyaret', 'Ziyaret sayısı'], ['harcama', 'Toplam harcama'], ['ikisi', 'İkisi (hangisi önce dolarsa)']].map(([k, ad]) => h('option', { value: k, selected: a.olcu === k }, t(ad))));
  const ziyaret = h('input', { type: 'text', inputmode: 'numeric', value: String(a.ziyaret) });
  const harcama = h('input', { type: 'text', inputmode: 'decimal', value: String(a.harcama).replace('.', ',') });
  const odul = h('select', null, h('option', { value: 'yuzde', selected: a.odul === 'yuzde' }, t('Yüzde indirim (%)')), h('option', { value: 'tutar', selected: a.odul === 'tutar' }, t('Sabit tutar indirim')));
  const deger = h('input', { type: 'text', inputmode: 'decimal', value: String(a.deger).replace('.', ',') });
  const karsilar = h('select', null,
    h('option', { value: 'birlikte', selected: a.karsilar === 'birlikte' }, t('Salon ve usta birlikte karşılar')),
    h('option', { value: 'salon', selected: a.karsilar === 'salon' }, t('Yalnız salon karşılar (ustanın payı değişmez)')));
  const hata = h('div', { class: 'hata', role: 'alert' });
  const dugme = h('button', { class: 'dugme', type: 'button' }, t('Kaydet'));
  const gorunum = () => { ziyaret.parentElement.hidden = olcu.value === 'harcama'; harcama.parentElement.hidden = olcu.value === 'ziyaret'; };
  olcu.addEventListener('change', gorunum);
  dugme.addEventListener('click', () => {
    hata.textContent = '';
    const z = parseInt(ziyaret.value, 10), hc = sayi(harcama.value), d = sayi(deger.value);
    if (olcu.value !== 'harcama' && !(Number.isInteger(z) && z >= 1 && z <= 100)) { hata.textContent = t('Ziyaret sayısı 1 ile 100 arasında olmalı.'); return; }
    if (olcu.value !== 'ziyaret' && !(Number.isFinite(hc) && hc > 0 && hc <= 100000000)) { hata.textContent = t('Harcama tutarını yazın.'); return; }
    if (!(Number.isFinite(d) && d > 0) || (odul.value === 'yuzde' && d > 100)) { hata.textContent = t('Ödül miktarını yazın (yüzde en çok 100).'); return; }
    const v = sadakatNormalle({ acik: acik.checked, olcu: olcu.value, ziyaret: Number.isInteger(z) ? z : a.ziyaret, harcama: Number.isFinite(hc) && hc > 0 ? hc : a.harcama, odul: odul.value, deger: d, karsilar: karsilar.value });
    kilitli(dugme, async () => {
      try {
        const b = writeBatch(db);
        b.set(doc(db, 'salons', S.salon.id, 'ayarlar', 'sadakat'), { ...v, guncelleme: serverTimestamp() });
        b.set(doc(collection(db, 'salons', S.salon.id, 'kayitlar')), { uid: auth.currentUser.uid, islem: 'ayar_sadakat', hedef: S.salon.id, ayrinti: 'Sadakat ' + (v.acik ? 'açık' : 'kapalı') + ', ' + v.olcu, zaman: serverTimestamp() });
        await b.commit();
        sadakatOnbellekSil(); p.kapat(); bildir(t('Kaydedildi')); if (sonra) sonra();
      } catch (err) { console.error(err); hata.textContent = hataMetni(err); }
    });
  });
  doldur(icerik,
    h('label', { class: 'onay-satir', for: 'sadakat-acik' }, acik, ' ', t('Sadakat ödülü açık')),
    h('p', { class: 'kucuk' }, t('Müşteri yeterli ziyarete ya da harcamaya ulaşınca ödeme ekranında ödülü uygulama düğmesi çıkar. Ödül kullanılınca sayaç yeniden başlar.')),
    h('label', null, t('Ölçü'), olcu),
    h('label', null, t('Kaç ziyarette bir ödül'), ziyaret),
    h('label', null, t('Kaç {s} harcamada bir ödül', { s: sembol() }), harcama),
    h('label', null, t('Ödül türü'), odul),
    h('label', null, t('Ödül miktarı'), deger),
    h('label', null, t('İndirimi kim karşılar?'), karsilar),
    h('p', { class: 'kucuk' }, t('İndirim yalnız hizmetlerden düşülür, ürün satışına uygulanmaz.')),
    hata, dugme);
  gorunum();
}
